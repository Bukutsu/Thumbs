export const WORD_LIST = [
  "the", "be", "of", "and", "a", "to", "in", "he", "have", "it", "that", "for",
  "they", "I", "with", "as", "not", "on", "she", "at", "by", "this", "we", "you",
  "do", "but", "from", "or", "which", "one", "would", "all", "will", "there",
  "say", "who", "make", "when", "can", "more", "if", "no", "man", "out", "other",
  "so", "what", "time", "up", "go", "about", "than", "into", "could", "state",
  "only", "new", "year", "some", "take", "come", "these", "know", "see", "use",
  "get", "like", "then", "first", "any", "work", "now", "may", "such", "give",
  "over", "think", "most", "even", "find", "day", "also", "after", "way", "many",
  "must", "look", "before", "great", "back", "through", "long", "where", "much",
  "should", "well", "people", "down", "own", "just", "because", "good", "each"
];

export const generateRandomWords = (count = 15) => {
  let result = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * WORD_LIST.length);
    result.push(WORD_LIST[randomIndex]);
  }
  return result.join(" ");
};
