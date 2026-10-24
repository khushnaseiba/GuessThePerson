pub struct Person {
    pub name: &'static str,
    pub traits: u16,
}

pub const PROPERTY_PHRASES: [&str; 10] = [
    "wear glasses",
    "have facial hair",
    "wear a hat",
    "have curly hair",
    "have brown hair",
    "have blonde hair",
    "have red hair",
    "have long hair",
    "have freckles",
    "wear earrings",
];

pub const PEOPLE: [Person; 20] = [
    Person { name: "Ava", traits: 657 },
    Person { name: "Benji", traits: 22 },
    Person { name: "Cleo", traits: 425 },
    Person { name: "Diego", traits: 74 },
    Person { name: "Eden", traits: 676 },
    Person { name: "Felix", traits: 275 },
    Person { name: "Gia", traits: 920 },
    Person { name: "Hugo", traits: 30 },
    Person { name: "Iris", traits: 801 },
    Person { name: "Juno", traits: 452 },
    Person { name: "Kai", traits: 539 },
    Person { name: "Lena", traits: 704 },
    Person { name: "Milo", traits: 918 },
    Person { name: "Nia", traits: 141 },
    Person { name: "Omar", traits: 802 },
    Person { name: "Poppy", traits: 969 },
    Person { name: "Quinn", traits: 284 },
    Person { name: "Ravi", traits: 194 },
    Person { name: "Skye", traits: 785 },
    Person { name: "Theo", traits: 262 },
];
