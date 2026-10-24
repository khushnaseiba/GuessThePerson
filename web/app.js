const $ = (selector) => document.querySelector(selector);
const decoder = new TextDecoder();
let wasm;
let people = [];
let properties = [];

function stringAt(pointer, length) {
  return decoder.decode(new Uint8Array(wasm.memory.buffer, pointer, length));
}

function portrait(index) {
  const image = document.createElement("img");
  image.src = `../assets/portraits/person-${String(index).padStart(2, "0")}.svg`;
  image.alt = `${people[index].name} portrait`;
  return image;
}

async function start() {
  try {
    const response = await fetch("./game.wasm");
    if (!response.ok) throw new Error("game.wasm was not found");
    const result = await WebAssembly.instantiate(await response.arrayBuffer(), {});
    wasm = result.instance.exports;
    people = Array.from({ length: wasm.person_count() }, (_, index) => ({
      name: stringAt(wasm.person_name_ptr(index), wasm.person_name_len(index)),
      traits: wasm.person_traits(index),
    }));
    properties = Array.from({ length: wasm.property_count() }, (_, index) => stringAt(wasm.property_name_ptr(index), wasm.property_name_len(index)));
    $("#count").textContent = people.length;
    const grid = $("#people-grid");
    people.forEach((person, index) => {
      const card = document.createElement("article");
      card.className = "person";
      card.append(portrait(index));
      const name = document.createElement("strong");
      name.textContent = person.name;
      const detail = document.createElement("small");
      detail.textContent = "candidate profile loaded";
      card.append(name, detail);
      grid.append(card);
    });
  } catch (error) {
    $("#error").hidden = false;
    $("#error").textContent = `The WASM module could not load (${error.message}). Run ./scripts/build.sh from the project root.`;
  }
}

start();
