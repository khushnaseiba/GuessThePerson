const $ = (selector) => document.querySelector(selector);
const decoder = new TextDecoder();
const invalid = 0xffffffff;
let wasm;
let people = [];
let properties = [];
function readText(pointer, length) { return decoder.decode(new Uint8Array(wasm.memory.buffer, pointer, length)); }
function imageAt(index) { const img = document.createElement("img"); img.src = `../assets/portraits/person-${String(index).padStart(2, "0")}.svg`; img.alt = `${people[index].name} portrait`; return img; }
function render() {
  const mask = wasm.game_candidates_mask();
  const grid = $("#people-grid");
  grid.replaceChildren();
  people.forEach((person, index) => {
    const active = (mask & (1 << index)) !== 0;
    const card = document.createElement("button");
    card.type = "button";
    card.className = `person${active ? "" : " eliminated"}`;
    card.disabled = !active || wasm.game_winner() !== 0;
    if (!active) { const stamp = document.createElement("span"); stamp.className = "stamp"; stamp.textContent = "OUT"; card.append(stamp); }
    card.append(imageAt(index));
    const name = document.createElement("strong"); name.textContent = person.name;
    const state = document.createElement("small"); state.textContent = active ? "still possible" : "eliminated";
    card.append(name, state);
    grid.append(card);
  });
  $("#count").textContent = wasm.game_candidate_count();
  const questionButtons = $("#questions"); questionButtons.replaceChildren();
  properties.forEach((phrase, index) => {
    const button = document.createElement("button"); button.type = "button"; button.textContent = phrase[0].toUpperCase() + phrase.slice(1);
    button.disabled = wasm.game_can_ask(index) === 0 || wasm.game_winner() !== 0;
    button.addEventListener("click", () => ask(index)); questionButtons.append(button);
  });
  const humanQ = wasm.game_last_human_question();
  const botQ = wasm.game_last_bot_question();
  const log = [];
  if (humanQ !== invalid) log.push(`You asked whether your person would ${properties[humanQ]}. Answer: ${wasm.game_last_human_answer() ? "YES" : "NO"}; ${wasm.game_last_human_eliminated()} crossed off.`);
  if (botQ !== invalid) log.push(`Bot asked whether your person would ${properties[botQ]}. Your truthful answer: ${wasm.game_last_bot_answer() ? "YES" : "NO"}; ${wasm.game_last_bot_eliminated()} crossed off its list.`);
  $("#log").textContent = log.length ? log.join(" ") : "No questions yet.";
  $("#status").textContent = `Your candidates: ${wasm.game_candidate_count()} · bot candidates: ${wasm.game_bot_candidates_count()}`;
  const winner = wasm.game_winner();
  $("#result").hidden = winner === 0;
  if (winner !== 0) {
    $("#result").className = winner === 2 ? "loss" : "";
    $("#result").textContent = winner === 1 ? "You got there first! Your candidate list reached one person." : `The bot got there first and found ${people[wasm.game_human_target()].name}. Start a new game to try again.`;
    $("#note").textContent = "Round over. Start a new game to replay.";
  }
}
function ask(property) {
  const result = wasm.game_ask(property);
  if (result === 1) $("#note").textContent = "That question is invalid.";
  else if (result === 2) $("#note").textContent = "That question no longer splits the candidates.";
  render();
}
function newGame() {
  let seed = Date.now() >>> 0;
  if (globalThis.crypto?.getRandomValues) { const value = new Uint32Array(1); crypto.getRandomValues(value); seed = value[0]; }
  wasm.game_new(seed);
  const target = wasm.game_human_target();
  const card = $("#secret-card"); card.replaceChildren(imageAt(target));
  const name = document.createElement("strong"); name.className = "secret-name"; name.textContent = people[target].name; card.append(name);
  $("#note").textContent = "Choose a trait that splits the board.";
  $("#result").hidden = true;
  render();
}
async function start() {
  try {
    const response = await fetch("./game.wasm"); if (!response.ok) throw new Error("game.wasm was not found");
    wasm = (await WebAssembly.instantiate(await response.arrayBuffer(), {})).instance.exports;
    if (wasm.api_version() !== 1) throw new Error("wrong WASM API version");
    people = Array.from({ length: wasm.person_count() }, (_, index) => ({ name: readText(wasm.person_name_ptr(index), wasm.person_name_len(index)), traits: wasm.person_traits(index) }));
    properties = Array.from({ length: wasm.property_count() }, (_, index) => readText(wasm.property_name_ptr(index), wasm.property_name_len(index)));
    $("#new-game").addEventListener("click", newGame); newGame();
  } catch (error) { $("#error").hidden = false; $("#error").textContent = `WASM could not load (${error.message}). Run ./scripts/build.sh and refresh.`; }
}
start();
