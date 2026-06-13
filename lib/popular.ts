// Curated popularity signal. The public-apis README has no popularity data, so
// we hand-rank the genuinely well-known, frequently-reached-for free APIs. The
// build pipeline matches an entry by hostname (www. stripped) and stamps a
// `popularity` rank onto it (1 = most popular). GitHub-repo links separately
// pick up real star counts during enrichment; the two signals are blended at
// sort time (curated rank wins, stars break ties / fill gaps).
//
// Keep this list tight and defensible — these are APIs a working dev actually
// recognizes, not an exhaustive ranking.

export interface PopularSeed {
  /** hostname match (lowercased, no www.) */
  host: string;
  /** lower = more popular */
  rank: number;
}

// Ordered most-popular first; index drives the rank.
const ORDER: string[] = [
  "jsonplaceholder.typicode.com", // the canonical "fake REST API"
  "pokeapi.co",
  "api.openweathermap.org",
  "openweathermap.org",
  "api.coingecko.com",
  "coingecko.com",
  "restcountries.com",
  "api.nasa.gov",
  "nasa.gov",
  "dog.ceo",
  "catfact.ninja",
  "open-meteo.com",
  "api.open-meteo.com",
  "api.github.com",
  "github.com",
  "api.spacexdata.com",
  "spacexdata.com",
  "rickandmortyapi.com",
  "swapi.dev",
  "jikan.moe",
  "api.jikan.moe",
  "agify.io",
  "genderize.io",
  "nationalize.io",
  "api.thecatapi.com",
  "thecatapi.com",
  "api.thedogapi.com",
  "thedogapi.com",
  "randomuser.me",
  "api.chucknorris.io",
  "chucknorris.io",
  "official-joke-api.appspot.com",
  "icanhazdadjoke.com",
  "api.adviceslip.com",
  "adviceslip.com",
  "api.coinpaprika.com",
  "coinpaprika.com",
  "openlibrary.org",
  "world.openfoodfacts.org",
  "openfoodfacts.org",
  "api.frankfurter.app",
  "frankfurter.app",
  "open.er-api.com",
  "api.exchangerate.host",
  "exchangerate.host",
  "dummyjson.com",
  "reqres.in",
  "api.tvmaze.com",
  "tvmaze.com",
  "api.disneyapi.dev",
  "disneyapi.dev",
  "ghibliapi.vercel.app",
  "ghibliapi.herokuapp.com",
  "api.quotable.io",
  "quotable.io",
  "zenquotes.io",
  "boredapi.com",
  "api.ipify.org",
  "ipify.org",
  "ipapi.co",
  "api.kanye.rest",
  "kanye.rest",
  "yesno.wtf",
  "api.artic.edu",
  "artic.edu",
  "datausa.io",
  "api.zippopotam.us",
  "zippopotam.us",
  "uselessfacts.jsph.pl",
  "shibe.online",
  "random.dog",
  "http.cat",
  "http.dog",
  "meowfacts.herokuapp.com",
  "api.sampleapis.com",
  "fakerapi.it",
];

export const POPULAR_SEEDS: PopularSeed[] = ORDER.map((host, i) => ({
  host,
  rank: i + 1,
}));

const SEED_MAP: Map<string, number> = new Map(
  POPULAR_SEEDS.map((s) => [s.host, s.rank])
);

export function popularityForHost(host: string): number | undefined {
  return SEED_MAP.get(host);
}

/** Total number of curated seeds (some won't match any README row). */
export const POPULAR_SEED_COUNT = POPULAR_SEEDS.length;
