const $ = (selector) => document.querySelector(selector);
const decoder = new TextDecoder();
const invalid = 0xffffffff;
let wasm;
let people = [];
let properties = [];

function textAt(pointer, length) { return decoder.decode(new Uint8Array(wasm.memory.buffer, pointer, length)); }
function portrait(index) {
  const img = document.createElement("img");
  img.src = `../assets/portraits/person-${String(index).padStart(2, "0")}.svg`;
  img.alt = `${people[index].name} portrait`;
  return img;
}
function render() {
  const mask = wasm.game_candidates_mask();
  const grid = $("#people-grid");
  grid.replaceChildren();
  people.forEach((person, index) => {
    const active = (mask & (1 << index)) !== 0;
    const card = document.createElement("button");
    card.className = `person${active ? "" : " eliminated"}`;
    card.type = "button";
    card.disabled = !active || wasm.game_winner() !== 0;
    if (!active) {
      const stamp = document.createElement("span");
      stamp.className = "stamp";
      stamp.textContent = "OUT";
      card.append(stamp);
    }
    card.append(portrait(index));
    const name = document.createElement("strong");
    name.textContent = person.name;
    const detail = document.createElement("small");
    detail.textContent = active ? "still possible" : "eliminated";
    card.append(name, detail);
    grid.append(card);
  });
  $("#count").textContent = wasm.game_candidate_count();
  $("#status").textContent = wasm.game_winner() ? "You found the person!" : `${wasm.game_candidate_count()} people remaining`;
  const last = wasm.game_last_question();
  if (last !== invalid) {
    const answer = wasm.game_last_answer() ? "YES" : "NO";
    $("#answer").textContent = `Does your person ${properties[last]}? ${answer}. ${wasm.game_last_eliminated()} candidates crossed off.`;
  }
  const questions = $("#questions");
  questions.replaceChildren();
  properties.forEach((phrase, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = phrase[0].toUpperCase() + phrase.slice(1);
    button.disabled = wasm.game_can_ask(index) === 0 || wasm.game_winner() !== 0;
    button.addEventListener("click", () => {
      const result = wasm.game_ask(index);
      if (result === 2) $("#note").textContent = "That trait no longer splits the remaining candidates.";
      render();
    });
    questions.append(button);
  });
  if (wasm.game_winner()) {
    $("#note").textContent = "You narrowed the list to one person. Start a new board to play again.";
    $("#answer").textContent += " You win!";
  }
}

async function start() {
  try {
    const response = await fetch("./game.wasm");
    if (!response.ok) throw new Error("game.wasm was not found");
    wasm = (await WebAssembly.instantiate(await response.arrayBuffer(), {})).instance.exports;
    if (wasm.api_version() !== 1) throw new Error("wrong WASM API");
    people = Array.from({ length: wasm.person_count() }, (_, i) => ({
      name: textAt(wasm.person_name_ptr(i), wasm.person_name_len(i)),
      traits: wasm.person_traits(i),
    }));
    properties = Array.from({ length: wasm.property_count() }, (_, i) => textAt(wasm.property_name_ptr(i), wasm.property_name_len(i)));
    $("#new-game").addEventListener("click", () => {
      let seed = Date.now() >>> 0;
      if (globalThis.crypto?.getRandomValues) { const value = new Uint32Array(1); crypto.getRandomValues(value); seed = value[0]; }
      wasm.game_new(seed);
      $("#answer").textContent = "No question asked yet.";
      $("#note").textContent = "Choose any question that splits the current board.";
      render();
    });
    wasm.game_new((Date.now() ^ 0x31a53d) >>> 0);
    render();
  } catch (error) {
    $("#error").hidden = false;
    $("#error").textContent = `The WASM module could not load (${error.message}). Run ./scripts/build.sh from the project root.`;
  }
}
start();
