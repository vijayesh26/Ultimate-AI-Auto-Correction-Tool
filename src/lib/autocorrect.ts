/**
 * TypeScript port of the Python Autocorrection engine.
 * Uses edit distance for spelling correction with probability ranking.
 */

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export class AutocorrectEngine {
  private wordCounts: Map<string, number> = new Map();
  private vocabulary: Set<string> = new Set();
  private totalWords = 0;
  private wordProb: Map<string, number> = new Map();
  private edits1Cache: Map<string, Set<string>> = new Map();

  constructor(corpusText: string) {
    const words = corpusText.toLowerCase().match(/\w+/g) || [];
    for (const w of words) {
      this.wordCounts.set(w, (this.wordCounts.get(w) || 0) + 1);
    }
    this.vocabulary = new Set(this.wordCounts.keys());
    this.totalWords = words.length || 1;
    for (const [w, c] of this.wordCounts) {
      this.wordProb.set(w, c / this.totalWords);
    }
  }

  get vocabularySize(): number {
    return this.vocabulary.size;
  }

  private edits1(word: string): Set<string> {
    const cached = this.edits1Cache.get(word);
    if (cached) return cached;

    const results: string[] = [];
    for (let i = 0; i <= word.length; i++) {
      const L = word.slice(0, i);
      const R = word.slice(i);
      if (R.length > 0) results.push(L + R.slice(1)); // delete
      if (R.length > 1) results.push(L + R[1] + R[0] + R.slice(2)); // swap
      if (R.length > 0) {
        for (const c of LETTERS) results.push(L + c + R.slice(1)); // replace
      }
      for (const c of LETTERS) results.push(L + c + R); // insert
    }

    const set = new Set(results);
    if (this.edits1Cache.size < 50000) this.edits1Cache.set(word, set);
    return set;
  }

  private edits2(word: string): Set<string> {
    const results = new Set<string>();
    for (const e1 of this.edits1(word)) {
      if (results.size > 50000) break;
      for (const e2 of this.edits1(e1)) {
        results.add(e2);
      }
    }
    return results;
  }

  private known(words: Set<string>): Set<string> {
    const result = new Set<string>();
    for (const w of words) {
      if (this.vocabulary.has(w)) result.add(w);
    }
    return result;
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  correctSpelling(word: string): Array<[string, number]> {
    if (!word) return [];
    word = word.toLowerCase();

    if (this.vocabulary.has(word)) {
      return [[word, this.wordProb.get(word) || 0]];
    }

    let candidates = this.known(this.edits1(word));
    if (candidates.size === 0) {
      candidates = this.known(this.edits2(word));
    }
    if (candidates.size === 0) return [];

    const ranked = Array.from(candidates)
      .map((w): [string, number] => [w, this.wordProb.get(w) || 0])
      .sort((a, b) => {
        const distA = this.levenshtein(word, a[0]);
        const distB = this.levenshtein(word, b[0]);
        if (distA !== distB) return distA - distB;
        return b[1] - a[1];
      });

    return ranked.slice(0, 5);
  }
}

// Built-in English corpus (common words — expanded for better coverage)
const COMMON_WORDS = `the the the of of and and to to a a in in is is it it you you that that he he was was for for on on are are with with as as i i his his they they be be at at one one have have this this from from or or had had by by hot hot but but some some what what there there we we can can out out other other were were all all your your when when up up use use word word how how said said an an each each she she which which do do their their time time if if will will way way about about many many then then them them would would write write like like so so these these her her long long make make thing thing see see him him two two has has look look more more day day could could go go come come did did my my sound sound no no most most number number who who over over know know water water than than call call first first people people may may down down side side been been now now find find head head stand stand own own page page should should country country found found answer answer school school grow grow study study still still learn learn plant plant cover cover food food sun sun four four thought thought let let keep keep eye eye never never last last door door between between city city tree tree cross cross since since hard hard start start might might story story saw saw far far sea sea draw draw left left late late run run don don while while press press close close night night real real life life few few stop stop open open seem seem together together next next white white children children begin begin got got walk walk example example ease ease paper paper often often always always music music those those both both mark mark book book letter letter until until mile mile river river car car feet feet care care second second group group carry carry took took rain rain eat eat room room friend friend began began idea idea fish fish mountain mountain north north once once base base hear hear horse horse cut cut sure sure watch watch color color face face wood wood main main enough enough plain plain girl girl usual usual young young ready ready above above ever ever red red list list though though feel feel talk talk bird bird soon soon body body dog dog family family direct direct pose pose leave leave song song measure measure state state product product black black short short numeral class class wind wind question question happen happen complete complete ship ship area area half half rock rock order order fire fire south south problem problem piece piece told told knew knew pass pass farm farm top top whole whole king king size size heard heard best best hour hour better better true true during during hundred hundred remember remember step step early early hold hold west west ground ground interest interest reach reach fast fast five five sing sing listen listen six six table table travel travel less less morning morning ten ten simple simple several several vowel toward toward war war lay lay against against pattern pattern slow slow center center love love person person money money serve serve appear appear road road map map science science rule rule govern govern pull pull cold cold notice notice voice voice fall fall power power town town fine fine certain certain fly fly unit unit lead lead cry cry dark dark machine machine note note wait wait plan plan figure figure star star box box noun noun field field rest rest correct correct able able pound pound done done beauty beauty drive drive stood stood contain contain front front teach teach week week final final gave gave green green oh oh quick quick develop develop sleep sleep warm warm free free minute minute strong strong special special mind mind behind behind clear clear tail tail produce produce fact fact street street inch inch lot lot nothing nothing course course stay stay wheel wheel full full force force blue blue object object decide decide surface surface deep deep moon moon island island foot foot yet yet busy busy test test record record boat boat common common gold gold possible possible plane plane age age dry dry wonder wonder laugh laugh thousand thousand ago ago ran ran check check game game shape shape yes yes cool cool miss miss brought brought heat heat snow snow bed bed bring bring sit sit perhaps perhaps fill fill east east weight weight language language among among
writing writing writing writing receive receive receive receive believe believe believe believe separate separate separate separate occur occurred occurred occur achieve achieve achieve achieve beautiful beautiful beautiful beautiful because because because because beginning beginning beginning beginning calendar calendar calendar calendar different different different different environment environment environment experience experience experience experience government government government government important important important important knowledge knowledge knowledge knowledge necessary necessary necessary necessary occasion occasion occasion occasion particular particular particular particular question question question question receive receive receive receive recommend recommend recommend recommend separate separate separate separate surprise surprise surprise surprise tomorrow tomorrow tomorrow tomorrow together together together together until until until until weather weather whether whether which which writing writing writing writing accept accept accept accept across across across across address address address address already already already already although although although although another another another another because because because because before before before before business business business business certain certain certain certain change change change change coming coming coming coming complete complete complete complete continue continue continue continue control control control control could could could could create create create create current current current current describe describe describe describe develop develop develop develop during during during during english english english english enough enough enough enough every every every every example example example example feature feature feature feature finally finally finally finally follow follow follow follow general general general general great great great great hello hello hello hello help help help help history history history history however however however however include include include include increase increase increase increase interest interest interest interest issue issue issue issue large large large large little little little little local local local local market market market market might might might might million million million million money money money money national national national national number number number number often often often often other other other other people people people people place place place place point point point point possible possible possible possible power power power power present present present present problem problem problem problem program program program program provide provide provide provide public public public public really really really really result result result result right right right right school school school school since since since since small small small small social social social social something something something something special special special special still still still still story story story story student student student student system system system system their their their their thing thing thing thing think think think think those those those those three three three three through through through through under under under under university university university university using using using using water water water water where where where where which which which which while while while while without without without without woman woman woman woman world world world world would would would would young young young young`;



let engineInstance: AutocorrectEngine | null = null;

export function getEngine(): AutocorrectEngine {
  if (!engineInstance) {
    // Repeat common words to build frequency distribution
    const expandedCorpus = COMMON_WORDS.repeat(3);
    engineInstance = new AutocorrectEngine(expandedCorpus);
  }
  return engineInstance;
}
