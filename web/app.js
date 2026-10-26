const $ = (selector) => document.querySelector(selector);
const utf8 = new TextDecoder();
const invalid = 0xffffffff;
let wasm;
let people = [];
let properties = [];
let pendingBotQuestion = invalid;
let botTimer = 0;
let nextPickerTimer = 0;

function readString(pointer, length) {
  return utf8.decode(new Uint8Array(wasm.memory.buffer, pointer, length));
}
function makePortrait(index) {
  const image = document.createElement("img");
  image.src = `./assets/portraits/person-${String(index).padStart(2, "0")}.svg`;
  image.alt = `${people[index].name} portrait`;
  image.loading = "lazy";
  return image;
}
function buildPersonCard(index, picker = false) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = picker ? "person-card pick-card" : "person-card";
  card.append(makePortrait(index));
  const name = document.createElement("span");
  name.className = "person-name";
  name.textContent = people[index].name;
  card.append(name);
  if (picker) card.addEventListener("click", () => newGame(index));
  return card;
}
function renderPicker() {
  const root = $("#picker-grid");
  root.replaceChildren();
  people.forEach((_, index) => root.append(buildPersonCard(index, true)));
}
function renderSecret() {
  const index = wasm.game_human_target();
  const card = $("#secret-card");
  card.replaceChildren(makePortrait(index));
  const name = document.createElement("strong");
  name.textContent = people[index].name;
  card.append(name);
}
function renderQuestions() {
  const root = $("#questions");
  root.replaceChildren();
  const usable = properties.filter((_, index) => wasm.game_can_ask(index) !== 0).length;
  $("#question-count").textContent = usable;
  properties.forEach((phrase, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "question-button";
    button.textContent = phrase[0].toUpperCase() + phrase.slice(1);
    button.disabled = wasm.game_can_ask(index) === 0 || wasm.game_winner() !== 0;
    button.addEventListener("click", () => askQuestion(index));
    root.append(button);
  });
  $("#question-note").textContent = usable ? `${usable} useful questions remain.` : "No useful questions remain.";
}
function renderPeople() {
  const root = $("#people-grid");
  const mask = wasm.game_candidates_mask();
  root.replaceChildren();
  people.forEach((person, index) => {
    const active = (mask & (1 << index)) !== 0;
    const card = buildPersonCard(index);
    card.classList.toggle("eliminated", !active);
    card.disabled = !active || wasm.game_winner() !== 0;
    person.traits.forEach((hasTrait, traitIndex) => {
      if (!hasTrait) return;
      const tag = document.createElement("span");
      tag.className = "trait-tag";
      tag.textContent = properties[traitIndex];
      card.append(tag);
    });
    root.append(card);
  });
  $("#remaining-count").textContent = wasm.game_candidate_count();
}
function logLine(actor, property, answer, eliminated) {
  const line = document.createElement("p");
  line.className = "log-entry";
  line.textContent = `${actor}: ${properties[property]}? ${answer ? "Yes" : "No"}. ${eliminated} eliminated.`;
  return line;
}
function renderLog() {
  const root = $("#round-log");
  root.replaceChildren();
  const human = wasm.game_last_human_question();
  const bot = wasm.game_last_bot_question();
  if (human === invalid && bot === invalid) {
    root.textContent = "No turns yet.";
    return;
  }
  if (human !== invalid) root.append(logLine("You asked", human, wasm.game_last_human_answer() !== 0, wasm.game_last_human_eliminated()));
  if (bot !== invalid) root.append(logLine("Bot asked", bot, wasm.game_last_bot_answer() !== 0, wasm.game_last_bot_eliminated()));
}
function renderResult() {
  const winner = wasm.game_winner();
  if (!winner) return;
  const title = winner === 1 ? "You win!" : "Bot wins";
  const copy = winner === 1 ? `You found ${people[Array.from({length: people.length}, (_, i) => i).find(i => (wasm.game_candidates_mask() & (1 << i)) !== 0)].name} first.` : `The bot found ${people[wasm.game_human_target()].name}.`;
  $("#win-title").textContent = title;
  $("#win-copy").textContent = copy;
  if (!$("#win-dialog").open) $("#win-dialog").showModal();
  if (!nextPickerTimer) {
    nextPickerTimer = window.setTimeout(() => {
      nextPickerTimer = 0;
      newGame();
    }, 2400);
  }
  document.body.classList.add("game-won");
  $("#turn-label").textContent = winner === 1 ? "You won" : "Bot won";
  $("#turn-detail").textContent = "Start another round to play again.";
  $("#result-banner").hidden = false;
  $("#result-banner").textContent = title;
}
function render() {
  renderQuestions();
  renderPeople();
  renderLog();
  $("#round-count").textContent = wasm.game_turns();
  renderResult();
}
function askQuestion(property) {
  if (wasm.game_winner()) return;
  const result = wasm.game_ask(property);
  if (result === 1 || result === 2) return;
  $("#turn-strip").classList.remove("turn-change");
  void $("#turn-strip").offsetWidth;
  $("#turn-strip").classList.add("turn-change");
  $("#turn-label").textContent = "Bot's turn";
  $("#turn-detail").textContent = "Thinking about your character";
  $("#game-area").classList.add("bot-thinking");
  render();
  if (wasm.game_winner()) return;
  pendingBotQuestion = wasm.game_last_bot_question();
  if (pendingBotQuestion === invalid) {
    $("#turn-label").textContent = "Your turn";
    return;
  }
  $("#bot-question-text").textContent = `Does your person ${properties[pendingBotQuestion]}?`;
  const correct = (people[wasm.game_human_target()].traits[pendingBotQuestion]);
  const yes = $("#answer-yes");
  const no = $("#answer-no");
  yes.disabled = !correct;
  no.disabled = correct;
  yes.classList.toggle("correct-answer", correct);
  no.classList.toggle("correct-answer", !correct);
  $("#answer-hint").textContent = "Only the truthful answer can be selected.";
  botTimer = window.setTimeout(() => {
    $("#game-area").classList.remove("bot-thinking");
    $("#answer-dialog").showModal();
  }, 850);
}
function answerBot() {
  $("#answer-dialog").close();
  $("#turn-label").textContent = "Your turn";
  $("#turn-detail").textContent = "Choose another question";
  render();
  if (!wasm.game_winner()) document.body.classList.remove("game-won");
}
function newGame(characterIndex = null) {
  window.clearTimeout(botTimer);
  window.clearTimeout(nextPickerTimer);
  nextPickerTimer = 0;
  $("#game-area").classList.remove("bot-thinking");
  if ($("#answer-dialog").open) $("#answer-dialog").close();
  if (characterIndex === null) {
    $("#game-area").hidden = true;
    $("#character-picker").hidden = false;
    $("#win-dialog").close();
    document.body.classList.remove("game-won");
    renderPicker();
    return;
  }
  const seed = globalThis.crypto?.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : (Date.now() >>> 0);
  wasm.game_new(seed, characterIndex);
  $("#character-picker").hidden = true;
  $("#game-area").hidden = false;
  $("#win-dialog").close();
  $("#turn-label").textContent = "Your turn";
  $("#turn-detail").textContent = "Choose a question";
  document.body.classList.remove("game-won");
  renderSecret();
  render();
}
async function start() {
  try {
    const response = await fetch("./game.wasm");
    if (!response.ok) throw new Error("game.wasm was not found");
    const result = await WebAssembly.instantiate(await response.arrayBuffer(), {});
    wasm = result.instance.exports;
    if (wasm.api_version() !== 1) throw new Error("unexpected WASM API version");
    people = Array.from({ length: wasm.person_count() }, (_, index) => ({
      name: readString(wasm.person_name_ptr(index), wasm.person_name_len(index)),
      traits: Array.from({ length: wasm.property_count() }, (_, trait) => (wasm.person_traits(index) & (1 << trait)) !== 0),
    }));
    properties = Array.from({ length: wasm.property_count() }, (_, index) => readString(wasm.property_name_ptr(index), wasm.property_name_len(index)));
    $("#new-game").addEventListener("click", () => newGame());
    $("#play-again").addEventListener("click", () => newGame());
    $("#answer-yes").addEventListener("click", answerBot);
    $("#answer-no").addEventListener("click", answerBot);
    $("#new-game").disabled = false;
    renderPicker();
  } catch (error) {
    $("#fatal-error").hidden = false;
    $("#fatal-error").textContent = `Game engine could not start: ${error.message}. Run ./scripts/build.sh and refresh.`;
  }
}
start();
