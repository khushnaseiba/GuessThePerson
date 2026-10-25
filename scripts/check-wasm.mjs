import { readFile } from 'node:fs/promises';

const bytes = await readFile(new URL('../web/game.wasm', import.meta.url));
const { instance } = await WebAssembly.instantiate(bytes, {});
const game = instance.exports;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

ensure(game.api_version() === 1, 'unexpected WASM API version');
const personCount = game.person_count();
const propertyCount = game.property_count();
ensure(personCount === 20, `expected 20 people, got ${personCount}`);
ensure(propertyCount === 10, `expected 10 properties, got ${propertyCount}`);

const profiles = Array.from({ length: personCount }, (_, index) => game.person_traits(index));
ensure(new Set(profiles).size === personCount, 'person profiles must be unique');

for (const seed of [1, 71, 2026, 0xdeadbeef, 0]) {
  game.game_new(seed);
  let steps = 0;
  while (game.game_winner() === 0 && steps < 30) {
    const before = game.game_candidate_count();
    let property = -1;
    for (let candidate = 0; candidate < propertyCount; candidate += 1) {
      if (game.game_can_ask(candidate) !== 0) {
        property = candidate;
        break;
      }
    }
    ensure(property !== -1, 'human has no useful question before reaching one candidate');
    const result = game.game_ask(property);
    ensure([0, 3, 4].includes(result), `unexpected action result ${result}`);
    ensure(game.game_candidate_count() < before || game.game_winner() !== 0, 'a question did not narrow the human candidates');
    ensure(game.game_candidate_count() > 0, 'candidate list became empty');
    steps += 1;
  }
  ensure(game.game_winner() === 1 || game.game_winner() === 2, `game did not finish for seed ${seed}`);
}

console.log('WASM smoke test passed: API, roster, candidate filtering, AI turns, and win conditions.');
