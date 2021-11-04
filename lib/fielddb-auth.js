exports.test = function test(string) {
  let relevantCharacters;
  let filteredString;
  let reversedString;
  if (typeof string !== 'string') {
    return false;
  }
  relevantCharacters = string.match(/[a-z0-9]/gi);
  if (!relevantCharacters) {
    return false;
  }
  filteredString = relevantCharacters.join('').toLowerCase();
  reversedString = filteredString.split('').reverse().join('');
  return filteredString.length > 0 && filteredString === reversedString;
};
