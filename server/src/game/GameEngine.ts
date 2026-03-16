import type {
  GameState, GameAction, Player, ResourceType, ResourceMap,
  VertexId, EdgeId, BoardState, DevCardType,
} from './types';
import { COSTS, EMPTY_RESOURCES, PLAYER_COLOR_LIST } from './types';
import { generateBoard } from './BoardGenerator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

function rollDie(): number { return Math.ceil(Math.random() * 6); }

function canAfford(resources: ResourceMap, cost: Partial<ResourceMap>): boolean {
  return (Object.keys(cost) as ResourceType[]).every(r => (resources[r] ?? 0) >= (cost[r] ?? 0));
}

function deduct(resources: ResourceMap, cost: Partial<ResourceMap>): ResourceMap {
  const r = { ...resources };
  for (const [k, v] of Object.entries(cost)) r[k as ResourceType] -= (v ?? 0);
  return r;
}

function hexKey(hexK: string): string { return hexK; }

/** Vertices adjacent to a given vertex through player-owned roads */
function adjVertices(
  vId: string,
  board: BoardState,
  playerId: string,
): string[] {
  const v = board.vertices[vId];
  if (!v) return [];
  const vHexSet = new Set(v.adjHexKeys);

  const result: string[] = [];
  for (const edge of Object.values(board.edges)) {
    if (edge.adjHexKeys.every(hk => vHexSet.has(hk))) {
      // This edge is adjacent to vId; find the other vertex
      for (const v2 of Object.values(board.vertices)) {
        if (v2.id === vId) continue;
        const v2HexSet = new Set(v2.adjHexKeys);
        if (edge.adjHexKeys.every(hk => v2HexSet.has(hk))) {
          result.push(v2.id);
        }
      }
    }
  }
  return result;
}

/** All vertex IDs adjacent (sharing an edge) to a vertex */
function adjacentVertexIds(vId: string, board: BoardState): string[] {
  const v = board.vertices[vId];
  if (!v) return [];
  const vHexSet = new Set(v.adjHexKeys);
  const result = new Set<string>();

  for (const edge of Object.values(board.edges)) {
    if (edge.adjHexKeys.every(hk => vHexSet.has(hk))) {
      for (const v2 of Object.values(board.vertices)) {
        if (v2.id !== vId) {
          const v2HexSet = new Set(v2.adjHexKeys);
          if (edge.adjHexKeys.every(hk => v2HexSet.has(hk))) {
            result.add(v2.id);
          }
        }
      }
    }
  }
  return [...result];
}

function computeLongestRoad(playerId: string, board: BoardState): number {
  const playerEdges = Object.values(board.edges).filter(e => e.road?.playerId === playerId);
  if (playerEdges.length === 0) return 0;

  // Build vertex graph
  const adj = new Map<string, Set<string>>();
  for (const edge of playerEdges) {
    const [hkA, hkB] = edge.adjHexKeys;
    const edgeVerts = Object.values(board.vertices).filter(v => {
      const s = new Set(v.adjHexKeys);
      return s.has(hkA) && s.has(hkB);
    });
    if (edgeVerts.length < 2) continue;
    const [v0, v1] = edgeVerts;
    if (!adj.has(v0.id)) adj.set(v0.id, new Set());
    if (!adj.has(v1.id)) adj.set(v1.id, new Set());
    adj.get(v0.id)!.add(v1.id);
    adj.get(v1.id)!.add(v0.id);
  }

  let best = 0;
  const dfs = (cur: string, visited: Set<string>): number => {
    const v = board.vertices[cur];
    if (v?.building && v.building.playerId !== playerId && visited.size > 0) return 0;
    visited.add(cur);
    let max = 0;
    for (const next of (adj.get(cur) ?? [])) {
      if (!visited.has(next)) max = Math.max(max, 1 + dfs(next, visited));
    }
    visited.delete(cur);
    return max;
  };

  for (const start of adj.keys()) best = Math.max(best, dfs(start, new Set()));
  return best;
}

// ── GameEngine class ──────────────────────────────────────────────────────────

interface EngineState extends GameState {
  devDeck: DevCardType[];
}

export class GameEngine {
  private state: EngineState;

  constructor(roomCode: string, playerNames: Array<{ id: string; name: string }>) {
    const { devDeck, ...board } = generateBoard();
    this.state = {
      roomCode,
      players: playerNames.map((p, i) => ({
        id: p.id,
        name: p.name,
        color: PLAYER_COLOR_LIST[i % PLAYER_COLOR_LIST.length],
        resources: { ...EMPTY_RESOURCES },
        devCards: [],
        victoryPoints: 0,
        knightsPlayed: 0,
        longestRoad: 0,
      })),
      board,
      phase: 'setup-place',
      currentPlayerIdx: 0,
      setupRound: 1,
      diceRoll: null,
      longestRoadOwner: null,
      largestArmyOwner: null,
      winner: null,
      devDeckSize: devDeck.length,
      pendingStealTargets: [],
      devDeck: devDeck as DevCardType[],
    };
  }

  getPublicState(): GameState {
    // Strip dev deck from public state
    const { devDeck, ...pub } = this.state;
    // Mask other players' dev cards (show counts as empty array for now — full game would show count only)
    return pub;
  }

  process(playerId: string, action: GameAction): string | null {
    const st = this.state;
    const currentPlayer = st.players[st.currentPlayerIdx];
    if (!currentPlayer) return 'No current player';

    // START_GAME is allowed by room host before game starts
    if (action.type === 'START_GAME') {
      if (st.phase !== 'lobby') return 'Game already started';
      st.phase = 'setup-place';
      return null;
    }

    if (currentPlayer.id !== playerId) return 'Not your turn';

    switch (action.type) {
      case 'PLACE_BURROW':    return this.placeBurrow(action.vertexId);
      case 'UPGRADE_WARREN':  return this.upgradeWarren(action.vertexId);
      case 'PLACE_ROAD':      return this.placeRoad(action.edgeId);
      case 'ROLL_DICE':       return this.rollDice();
      case 'MOVE_ROBBER':     return this.moveRobber(action.hexKey);
      case 'STEAL':           return this.steal(action.targetPlayerId);
      case 'BANK_TRADE':      return this.bankTrade(action.give, action.receive);
      case 'BUY_DEV_CARD':    return this.buyDevCard();
      case 'PLAY_GUARD_BUNNY':       return this.playGuardBunny();
      case 'PLAY_DIG_TUNNELS':       return this.playDigTunnels();
      case 'PLAY_SPRING_HARVEST':    return this.playSpringHarvest(action.r1, action.r2);
      case 'PLAY_HOARD_CARROTS':     return this.playHoardCarrots(action.resource);
      case 'END_TURN':        return this.endTurn();
      default:                return 'Unknown action';
    }
  }

  // ── Setup phase ─────────────────────────────────────────────────────────────

  private placeBurrow(vertexId: VertexId): string | null {
    const st = this.state;
    if (st.phase !== 'setup-place') return 'Wrong phase';

    const vertex = st.board.vertices[vertexId];
    if (!vertex) return 'Invalid vertex';
    if (vertex.building) return 'Vertex occupied';

    // Distance rule: no adjacent vertices can have buildings
    for (const adjId of adjacentVertexIds(vertexId, st.board)) {
      if (st.board.vertices[adjId]?.building) return 'Too close to another building';
    }

    // During main game, check resources (not in setup phases)
    if (st.phase !== 'setup-place' && st.phase !== 'setup-road') {
      const p = st.players[st.currentPlayerIdx];
      if (!canAfford(p.resources, COSTS.burrow)) return 'Not enough resources';
      p.resources = deduct(p.resources, COSTS.burrow);
    }

    vertex.building = { type: 'burrow', playerId: st.players[st.currentPlayerIdx].id };
    this.addVP(st.currentPlayerIdx, 1);

    // Setup round 2: give resources for second burrow
    if (st.setupRound === 2) {
      const p = st.players[st.currentPlayerIdx];
      for (const hk of vertex.adjHexKeys) {
        const tile = st.board.tiles.find(t => `${t.coord.q},${t.coord.r},${t.coord.s}` === hk);
        if (tile && tile.type !== 'desert') {
          p.resources[tile.type as ResourceType]++;
        }
      }
    }

    st.phase = 'setup-road';
    return null;
  }

  private placeRoad(edgeId: EdgeId): string | null {
    const st = this.state;
    if (st.phase !== 'setup-road' && st.phase !== 'main') return 'Wrong phase';

    const edge = st.board.edges[edgeId];
    if (!edge) return 'Invalid edge';
    if (edge.road) return 'Edge occupied';

    const playerId = st.players[st.currentPlayerIdx].id;

    if (st.phase === 'main') {
      const p = st.players[st.currentPlayerIdx];
      if (!canAfford(p.resources, COSTS.road)) return 'Not enough resources';
      p.resources = deduct(p.resources, COSTS.road);
    }

    // Validate road connects to player's network
    const [hkA, hkB] = edge.adjHexKeys;
    const adjVerts = Object.values(st.board.vertices).filter(v => {
      const s = new Set(v.adjHexKeys);
      return s.has(hkA) && s.has(hkB);
    });

    const canConnect = adjVerts.some(v => {
      if (v.building?.playerId === playerId) return true;
      // Connected via another road
      return Object.values(st.board.edges).some(e2 => {
        if (e2.id === edgeId || e2.road?.playerId !== playerId) return false;
        const s = new Set(v.adjHexKeys);
        return e2.adjHexKeys.every(hk => s.has(hk));
      });
    });

    if (!canConnect) return 'Road must connect to your network';

    edge.road = { playerId };

    // Update longest road
    this.updateLongestRoad();

    if (st.phase === 'setup-road') {
      this.advanceSetup();
    }
    return null;
  }

  private advanceSetup() {
    const st = this.state;
    const n = st.players.length;
    const idx = st.currentPlayerIdx;

    if (st.setupRound === 1) {
      if (idx < n - 1) {
        st.currentPlayerIdx = idx + 1;
      } else {
        // Switch to round 2 — reverse
        st.setupRound = 2;
      }
    } else {
      // setupRound === 2
      if (idx > 0) {
        st.currentPlayerIdx = idx - 1;
      } else {
        // Setup done
        st.phase = 'roll';
        st.currentPlayerIdx = 0;
        return;
      }
    }
    st.phase = 'setup-place';
  }

  // ── Main game ───────────────────────────────────────────────────────────────

  private rollDice(): string | null {
    const st = this.state;
    if (st.phase !== 'roll') return 'Wrong phase';

    const d1 = rollDie(), d2 = rollDie();
    st.diceRoll = [d1, d2];
    const total = d1 + d2;

    if (total === 7) {
      // Discard rule
      for (const p of st.players) {
        const total = Object.values(p.resources).reduce((a, b) => a + b, 0);
        if (total > 7) {
          const discard = Math.floor(total / 2);
          let left = discard;
          for (const r of ['carrots', 'fluff', 'sticks', 'clay', 'pebbles'] as ResourceType[]) {
            const take = Math.min(p.resources[r], left);
            p.resources[r] -= take;
            left -= take;
            if (left === 0) break;
          }
        }
      }
      st.phase = 'robber-move';
    } else {
      this.distributeResources(total);
      st.phase = 'main';
    }
    return null;
  }

  private distributeResources(dice: number) {
    const st = this.state;
    for (const tile of st.board.tiles) {
      if (tile.diceNumber !== dice || tile.hasRobber) continue;
      const hk = `${tile.coord.q},${tile.coord.r},${tile.coord.s}`;
      for (const vertex of Object.values(st.board.vertices)) {
        if (!vertex.building || !vertex.adjHexKeys.includes(hk)) continue;
        const p = st.players.find(p => p.id === vertex.building!.playerId);
        if (!p) continue;
        const amount = vertex.building.type === 'warren' ? 2 : 1;
        p.resources[tile.type as ResourceType] += amount;
      }
    }
  }

  private moveRobber(hexK: string): string | null {
    const st = this.state;
    if (st.phase !== 'robber-move') return 'Wrong phase';

    const tile = st.board.tiles.find(t => `${t.coord.q},${t.coord.r},${t.coord.s}` === hexK);
    if (!tile) return 'Invalid tile';

    // Unset old robber
    for (const t of st.board.tiles) t.hasRobber = false;
    tile.hasRobber = true;

    // Find steal targets: players with buildings on adjacent vertices
    const playerId = st.players[st.currentPlayerIdx].id;
    const targets = new Set<string>();
    for (const vertex of Object.values(st.board.vertices)) {
      if (vertex.adjHexKeys.includes(hexK) && vertex.building && vertex.building.playerId !== playerId) {
        targets.add(vertex.building.playerId);
      }
    }

    st.pendingStealTargets = [...targets];
    if (targets.size === 0) {
      st.phase = 'main';
    } else if (targets.size === 1) {
      this.stealFrom([...targets][0]);
      st.phase = 'main';
    } else {
      st.phase = 'robber-steal';
    }
    return null;
  }

  private steal(targetId: string): string | null {
    const st = this.state;
    if (st.phase !== 'robber-steal') return 'Wrong phase';
    if (!st.pendingStealTargets.includes(targetId)) return 'Invalid target';
    this.stealFrom(targetId);
    st.phase = 'main';
    return null;
  }

  private stealFrom(targetId: string) {
    const st = this.state;
    const thief = st.players[st.currentPlayerIdx];
    const target = st.players.find(p => p.id === targetId);
    if (!target) return;

    const available = (Object.keys(target.resources) as ResourceType[]).filter(r => target.resources[r] > 0);
    if (available.length === 0) return;
    const stolen = available[Math.floor(Math.random() * available.length)];
    target.resources[stolen]--;
    thief.resources[stolen]++;
  }

  private upgradeWarren(vertexId: VertexId): string | null {
    const st = this.state;
    if (st.phase !== 'main') return 'Wrong phase';

    const vertex = st.board.vertices[vertexId];
    if (!vertex) return 'Invalid vertex';
    const playerId = st.players[st.currentPlayerIdx].id;
    if (vertex.building?.playerId !== playerId || vertex.building.type !== 'burrow') {
      return 'Must upgrade your own burrow';
    }

    const p = st.players[st.currentPlayerIdx];
    if (!canAfford(p.resources, COSTS.warren)) return 'Not enough resources';
    p.resources = deduct(p.resources, COSTS.warren);
    vertex.building.type = 'warren';
    this.addVP(st.currentPlayerIdx, 1); // warren = 2 total, burrow = 1
    return null;
  }

  private bankTrade(give: ResourceType, receive: ResourceType): string | null {
    const st = this.state;
    if (st.phase !== 'main') return 'Wrong phase';
    const p = st.players[st.currentPlayerIdx];
    if (p.resources[give] < 4) return 'Need 4 of the same resource';
    p.resources[give] -= 4;
    p.resources[receive]++;
    return null;
  }

  private buyDevCard(): string | null {
    const st = this.state;
    if (st.phase !== 'main') return 'Wrong phase';
    if (st.devDeck.length === 0) return 'Dev card deck is empty';
    const p = st.players[st.currentPlayerIdx];
    if (!canAfford(p.resources, COSTS['dev-card'])) return 'Not enough resources';
    p.resources = deduct(p.resources, COSTS['dev-card']);
    const card = st.devDeck.pop()!;
    p.devCards.push(card as DevCardType);
    st.devDeckSize = st.devDeck.length;
    if (card === 'lucky-clover') {
      this.addVP(st.currentPlayerIdx, 1);
    }
    this.checkWin();
    return null;
  }

  private playGuardBunny(): string | null {
    const st = this.state;
    if (st.phase !== 'main') return 'Wrong phase';
    const p = st.players[st.currentPlayerIdx];
    const idx = p.devCards.indexOf('guard-bunny');
    if (idx < 0) return 'No Guard Bunny card';
    p.devCards.splice(idx, 1);
    p.knightsPlayed++;
    this.updateLargestArmy();
    st.phase = 'robber-move';
    return null;
  }

  private playDigTunnels(): string | null {
    const st = this.state;
    if (st.phase !== 'main') return 'Wrong phase';
    const p = st.players[st.currentPlayerIdx];
    const idx = p.devCards.indexOf('dig-tunnels');
    if (idx < 0) return 'No Dig Tunnels card';
    p.devCards.splice(idx, 1);
    // Give 2 free roads (simplified: just add to resources)
    p.resources.sticks += 2;
    p.resources.clay += 2;
    return null;
  }

  private playSpringHarvest(r1: ResourceType, r2: ResourceType): string | null {
    const st = this.state;
    if (st.phase !== 'main') return 'Wrong phase';
    const p = st.players[st.currentPlayerIdx];
    const idx = p.devCards.indexOf('spring-harvest');
    if (idx < 0) return 'No Spring Harvest card';
    p.devCards.splice(idx, 1);
    p.resources[r1]++;
    p.resources[r2]++;
    return null;
  }

  private playHoardCarrots(resource: ResourceType): string | null {
    const st = this.state;
    if (st.phase !== 'main') return 'Wrong phase';
    const p = st.players[st.currentPlayerIdx];
    const idx = p.devCards.indexOf('hoard-carrots');
    if (idx < 0) return 'No Hoard Carrots card';
    p.devCards.splice(idx, 1);
    for (const other of st.players) {
      if (other.id === p.id) continue;
      p.resources[resource] += other.resources[resource];
      other.resources[resource] = 0;
    }
    return null;
  }

  private endTurn(): string | null {
    const st = this.state;
    if (st.phase !== 'main') return 'Wrong phase';
    st.currentPlayerIdx = (st.currentPlayerIdx + 1) % st.players.length;
    st.phase = 'roll';
    st.diceRoll = null;
    return null;
  }

  // ── Win / special cards ──────────────────────────────────────────────────────

  private addVP(playerIdx: number, count: number) {
    this.state.players[playerIdx].victoryPoints += count;
    this.checkWin();
  }

  private checkWin() {
    for (const p of this.state.players) {
      if (p.victoryPoints >= 10) {
        this.state.winner = p.id;
        this.state.phase = 'game-over';
      }
    }
  }

  private updateLongestRoad() {
    const st = this.state;
    let best = 4; // threshold
    let bestId: string | null = st.longestRoadOwner;

    for (const p of st.players) {
      const len = computeLongestRoad(p.id, st.board);
      p.longestRoad = len;
      if (len > best) { best = len; bestId = p.id; }
    }

    if (bestId !== st.longestRoadOwner) {
      if (st.longestRoadOwner) {
        const old = st.players.find(p => p.id === st.longestRoadOwner);
        if (old) old.victoryPoints -= 2;
      }
      st.longestRoadOwner = bestId;
      if (bestId) {
        const p = st.players.find(p => p.id === bestId);
        if (p) p.victoryPoints += 2;
      }
    }
  }

  private updateLargestArmy() {
    const st = this.state;
    let best = 2; // threshold
    let bestId: string | null = st.largestArmyOwner;

    for (const p of st.players) {
      if (p.knightsPlayed > best) { best = p.knightsPlayed; bestId = p.id; }
    }

    if (bestId !== st.largestArmyOwner) {
      if (st.largestArmyOwner) {
        const old = st.players.find(p => p.id === st.largestArmyOwner);
        if (old) old.victoryPoints -= 2;
      }
      st.largestArmyOwner = bestId;
      if (bestId) {
        const p = st.players.find(p => p.id === bestId);
        if (p) p.victoryPoints += 2;
      }
    }
  }
}
