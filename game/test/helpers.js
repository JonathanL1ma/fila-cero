export const drawn = (...rowsTopFirst) =>
  rowsTopFirst
    .map((row) => [...row].map((ch) => (ch === '.' ? 0 : Number(ch))))
    .reverse()

export const empty = () => drawn('........', '........', '........', '........', '........', '........', '........')
