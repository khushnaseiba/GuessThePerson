use crate::data::{useful_question, yes_mask, ALL_CANDIDATES, INVALID, PEOPLE, PROPERTY_PHRASES};

#[derive(Clone, Copy)]
pub struct Game {
    pub bot_target: u32,
    pub human_target: u32,
    pub candidates: u32,
    pub bot_candidates: u32,
    pub winner: u32,
    pub last_human_question: u32,
    pub last_human_answer: u32,
    pub last_human_eliminated: u32,
    pub last_bot_question: u32,
    pub last_bot_answer: u32,
    pub last_bot_eliminated: u32,
    pub turns: u32,
    rng: u32,
}

impl Game {
    pub const fn empty() -> Self {
        Self {
            bot_target: 0,
            human_target: 0,
            candidates: 0,
            bot_candidates: 0,
            winner: 0,
            last_human_question: INVALID,
            last_human_answer: 0,
            last_human_eliminated: 0,
            last_bot_question: INVALID,
            last_bot_answer: 0,
            last_bot_eliminated: 0,
            turns: 0,
            rng: 1,
        }
    }

    pub fn new(seed: u32) -> Self {
        let mut game = Self::empty();
        game.rng = if seed == 0 { 0x9e37_79b9 } else { seed };
        game.human_target = game.next_random() % PEOPLE.len() as u32;
        game.bot_target = game.next_random() % PEOPLE.len() as u32;
        if game.bot_target == game.human_target {
            game.bot_target = (game.bot_target + 1) % PEOPLE.len() as u32;
        }
        game.candidates = ALL_CANDIDATES;
        game.bot_candidates = ALL_CANDIDATES;
        game
    }

    fn next_random(&mut self) -> u32 {
        let mut value = self.rng;
        value ^= value << 13;
        value ^= value >> 17;
        value ^= value << 5;
        self.rng = value;
        value
    }

    fn choose_question(&self, candidates: u32, avoid: u32) -> Option<u32> {
        let count = candidates.count_ones() as i32;
        if count <= 1 {
            return None;
        }
        let mut best = None;
        let mut best_score = i32::MAX;
        for pass in 0..2 {
            for property in 0..PROPERTY_PHRASES.len() as u32 {
                if pass == 0 && property == avoid {
                    continue;
                }
                if !useful_question(candidates, property) {
                    continue;
                }
                let yes_count = (candidates & yes_mask(property)).count_ones() as i32;
                let score = (count - 2 * yes_count).abs();
                if score < best_score {
                    best = Some(property);
                    best_score = score;
                }
            }
            if best.is_some() {
                return best;
            }
        }
        best
    }

    pub fn can_ask(&self, property: u32) -> bool {
        self.winner == 0 && useful_question(self.candidates, property)
    }

    pub fn ask(&mut self, property: u32) -> u32 {
        if self.winner != 0 {
            return 5;
        }
        if self.candidates.count_ones() == 1 {
            self.winner = 1;
            return 3;
        }
        if self.bot_candidates.count_ones() == 1 {
            self.winner = 2;
            return 4;
        }
        if property as usize >= PROPERTY_PHRASES.len() {
            return 1;
        }
        if !self.can_ask(property) {
            return 2;
        }

        self.last_human_question = property;
        self.last_bot_question = INVALID;
        self.last_bot_eliminated = 0;
        let previous = self.candidates;
        let answer = (PEOPLE[self.bot_target as usize].traits & (1 << property) != 0) as u32;
        let yes = yes_mask(property);
        self.candidates = if answer == 1 { previous & yes } else { previous & !yes };
        self.last_human_answer = answer;
        self.last_human_eliminated = previous.count_ones() - self.candidates.count_ones();
        self.turns += 1;

        if self.candidates.count_ones() == 1 {
            self.winner = 1;
            return 3;
        }

        let Some(bot_question) = self.choose_question(self.bot_candidates, property) else {
            if self.bot_candidates.count_ones() == 1 {
                self.winner = 2;
                return 4;
            }
            return 6;
        };
        self.last_bot_question = bot_question;
        let previous_bot = self.bot_candidates;
        let bot_answer = (PEOPLE[self.human_target as usize].traits & (1 << bot_question) != 0) as u32;
        let bot_yes = yes_mask(bot_question);
        self.bot_candidates = if bot_answer == 1 { previous_bot & bot_yes } else { previous_bot & !bot_yes };
        self.last_bot_answer = bot_answer;
        self.last_bot_eliminated = previous_bot.count_ones() - self.bot_candidates.count_ones();

        if self.bot_candidates.count_ones() == 1 {
            self.winner = 2;
            return 4;
        }
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_person_has_a_distinct_property_profile() {
        for left in 0..PEOPLE.len() {
            for right in left + 1..PEOPLE.len() {
                assert_ne!(PEOPLE[left].traits, PEOPLE[right].traits);
            }
        }
    }

    #[test]
    fn question_reduces_candidates_and_keeps_the_target() {
        let mut game = Game::new(71);
        let before = game.candidates.count_ones();
        let property = (0..PROPERTY_PHRASES.len() as u32)
            .find(|property| game.can_ask(*property))
            .unwrap();
        let result = game.ask(property);
        assert!(result == 0 || result == 3 || result == 4);
        assert!(game.candidates.count_ones() < before || game.winner != 0);
        assert_ne!(game.candidates & (1 << game.bot_target), 0);
    }

    #[test]
    fn invalid_and_unhelpful_questions_do_not_mutate_candidates() {
        let mut game = Game::new(9);
        let before = game.candidates;
        assert_eq!(game.ask(99), 1);
        assert_eq!(game.candidates, before);
        game.candidates = (1 << 0) | (1 << 1);
        let property = (0..PROPERTY_PHRASES.len() as u32)
            .find(|property| !useful_question(game.candidates, *property))
            .unwrap();
        assert_eq!(game.ask(property), 2);
        assert_eq!(game.candidates, (1 << 0) | (1 << 1));
    }

    #[test]
    fn one_candidate_wins_before_another_question() {
        let mut game = Game::new(31);
        game.candidates = 1 << game.bot_target;
        assert_eq!(game.ask(0), 3);
        assert_eq!(game.winner, 1);
    }

    #[test]
    fn a_full_game_eventually_finishes() {
        let mut game = Game::new(2026);
        for _ in 0..30 {
            if game.winner != 0 {
                break;
            }
            let property = (0..PROPERTY_PHRASES.len() as u32)
                .find(|property| game.can_ask(*property))
                .unwrap();
            game.ask(property);
        }
        assert_ne!(game.winner, 0);
    }
}
