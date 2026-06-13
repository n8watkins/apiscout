// Curated sample endpoints for the live playground. The public-apis README
// lists documentation/homepage URLs, not callable endpoints — so for the most
// popular no-auth APIs we hand-pick a real GET endpoint that returns JSON.
// Keyed by a normalized hostname (www. stripped). When there's no curated
// entry we fall back to the listed URL and let the user edit it.

export interface Sample {
  endpoint: string;
  note?: string;
}

// hostname (lowercased, no www.) -> sample endpoint
export const SAMPLES: Record<string, Sample> = {
  "catfact.ninja": { endpoint: "https://catfact.ninja/fact" },
  "alexwohlbruck.github.io": { endpoint: "https://cat-fact.herokuapp.com/facts/random" },
  "cat-fact.herokuapp.com": { endpoint: "https://cat-fact.herokuapp.com/facts/random" },
  "meowfacts.herokuapp.com": { endpoint: "https://meowfacts.herokuapp.com/" },
  "shibe.online": { endpoint: "https://shibe.online/api/shibes?count=1" },
  "random.dog": { endpoint: "https://random.dog/woof.json" },
  "jikan.moe": { endpoint: "https://api.jikan.moe/v4/anime?q=naruto&limit=1" },
  "api.jikan.moe": { endpoint: "https://api.jikan.moe/v4/anime?q=naruto&limit=1" },
  "ghibliapi.herokuapp.com": { endpoint: "https://ghibliapi.vercel.app/films?limit=1" },
  "ghibliapi.vercel.app": { endpoint: "https://ghibliapi.vercel.app/films?limit=1" },
  "dog.ceo": { endpoint: "https://dog.ceo/api/breeds/image/random" },
  "kinduff.github.io": { endpoint: "https://dog-api.kinduff.com/api/facts" },
  "dukengn.github.io": { endpoint: "https://dog-api.kinduff.com/api/facts" },
  "http.cat": { endpoint: "https://http.cat/200", note: "Returns an image — try opening in a new tab." },
  "http.dog": { endpoint: "https://http.dog/200.json" },
  "boredapi.com": { endpoint: "https://www.boredapi.com/api/activity" },
  "agify.io": { endpoint: "https://api.agify.io?name=michael" },
  "genderize.io": { endpoint: "https://api.genderize.io?name=alex" },
  "nationalize.io": { endpoint: "https://api.nationalize.io?name=nathan" },
  "api.adviceslip.com": { endpoint: "https://api.adviceslip.com/advice" },
  "adviceslip.com": { endpoint: "https://api.adviceslip.com/advice" },
  "official-joke-api.appspot.com": { endpoint: "https://official-joke-api.appspot.com/random_joke" },
  "icanhazdadjoke.com": { endpoint: "https://icanhazdadjoke.com/", note: "Send Accept: application/json for JSON." },
  "api.kanye.rest": { endpoint: "https://api.kanye.rest" },
  "kanye.rest": { endpoint: "https://api.kanye.rest" },
  "api.chucknorris.io": { endpoint: "https://api.chucknorris.io/jokes/random" },
  "chucknorris.io": { endpoint: "https://api.chucknorris.io/jokes/random" },
  "uselessfacts.jsph.pl": { endpoint: "https://uselessfacts.jsph.pl/api/v2/facts/random" },
  "api.publicapis.org": { endpoint: "https://api.publicapis.org/entries" },
  "publicapis.org": { endpoint: "https://api.publicapis.org/entries" },
  "jsonplaceholder.typicode.com": { endpoint: "https://jsonplaceholder.typicode.com/todos/1" },
  "reqres.in": { endpoint: "https://reqres.in/api/users?page=1" },
  "restcountries.com": { endpoint: "https://restcountries.com/v3.1/name/peru" },
  "api.coindesk.com": { endpoint: "https://api.coindesk.com/v1/bpi/currentprice.json" },
  "api.coingecko.com": { endpoint: "https://api.coingecko.com/api/v3/ping" },
  "coingecko.com": { endpoint: "https://api.coingecko.com/api/v3/ping" },
  "api.exchangerate.host": { endpoint: "https://api.exchangerate.host/latest?base=USD" },
  "exchangerate.host": { endpoint: "https://api.exchangerate.host/latest?base=USD" },
  "open.er-api.com": { endpoint: "https://open.er-api.com/v6/latest/USD" },
  "api.frankfurter.app": { endpoint: "https://api.frankfurter.app/latest" },
  "frankfurter.app": { endpoint: "https://api.frankfurter.app/latest" },
  "pokeapi.co": { endpoint: "https://pokeapi.co/api/v2/pokemon/ditto" },
  "api.spacexdata.com": { endpoint: "https://api.spacexdata.com/v5/launches/latest" },
  "spacexdata.com": { endpoint: "https://api.spacexdata.com/v5/launches/latest" },
  "api.thecatapi.com": { endpoint: "https://api.thecatapi.com/v1/images/search" },
  "thecatapi.com": { endpoint: "https://api.thecatapi.com/v1/images/search" },
  "api.thedogapi.com": { endpoint: "https://api.thedogapi.com/v1/images/search" },
  "thedogapi.com": { endpoint: "https://api.thedogapi.com/v1/images/search" },
  "randomuser.me": { endpoint: "https://randomuser.me/api/" },
  "api.ipify.org": { endpoint: "https://api.ipify.org?format=json" },
  "ipify.org": { endpoint: "https://api.ipify.org?format=json" },
  "ipapi.co": { endpoint: "https://ipapi.co/json/" },
  "api.github.com": { endpoint: "https://api.github.com/users/n8watkins" },
  "github.com": { endpoint: "https://api.github.com/repos/public-apis/public-apis" },
  "api.tvmaze.com": { endpoint: "https://api.tvmaze.com/search/shows?q=girls" },
  "tvmaze.com": { endpoint: "https://api.tvmaze.com/search/shows?q=girls" },
  "openlibrary.org": { endpoint: "https://openlibrary.org/api/books?bibkeys=ISBN:9780140328721&format=json&jscmd=data" },
  "api.zippopotam.us": { endpoint: "https://api.zippopotam.us/us/90210" },
  "zippopotam.us": { endpoint: "https://api.zippopotam.us/us/90210" },
  "dummyjson.com": { endpoint: "https://dummyjson.com/products/1" },
  "fakerapi.it": { endpoint: "https://fakerapi.it/api/v1/persons?_quantity=1" },
  "api.artic.edu": { endpoint: "https://api.artic.edu/api/v1/artworks?limit=1" },
  "artic.edu": { endpoint: "https://api.artic.edu/api/v1/artworks?limit=1" },
  "api.sampleapis.com": { endpoint: "https://api.sampleapis.com/coffee/hot" },
  "world.openfoodfacts.org": { endpoint: "https://world.openfoodfacts.org/api/v0/product/737628064502.json" },
  "openfoodfacts.org": { endpoint: "https://world.openfoodfacts.org/api/v0/product/737628064502.json" },
  "api.open-meteo.com": { endpoint: "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true" },
  "open-meteo.com": { endpoint: "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true" },
  "api.disneyapi.dev": { endpoint: "https://api.disneyapi.dev/character?page=1" },
  "disneyapi.dev": { endpoint: "https://api.disneyapi.dev/character?page=1" },
  "rickandmortyapi.com": { endpoint: "https://rickandmortyapi.com/api/character/1" },
  "swapi.dev": { endpoint: "https://swapi.dev/api/people/1/" },
  "api.quotable.io": { endpoint: "https://api.quotable.io/random" },
  "quotable.io": { endpoint: "https://api.quotable.io/random" },
  "zenquotes.io": { endpoint: "https://zenquotes.io/api/random" },
  "yesno.wtf": { endpoint: "https://yesno.wtf/api" },
  "api.nasa.gov": { endpoint: "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY" },
  "nasa.gov": { endpoint: "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY" },
  "api.coinpaprika.com": { endpoint: "https://api.coinpaprika.com/v1/global" },
  "coinpaprika.com": { endpoint: "https://api.coinpaprika.com/v1/global" },
  "api.gameofthronesquotes.xyz": { endpoint: "https://api.gameofthronesquotes.xyz/v1/random" },
  "datausa.io": { endpoint: "https://datausa.io/api/data?drilldowns=Nation&measures=Population" },
};

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Resolve a callable sample endpoint for an API entry. Returns a curated
 * endpoint when we have one, otherwise the listed URL (so the user can edit it
 * in the playground). `curated` flags whether we picked a known-good endpoint.
 */
export function resolveSample(url: string): { endpoint: string; curated: boolean; note?: string } {
  const h = host(url);
  const s = SAMPLES[h];
  if (s) return { endpoint: s.endpoint, curated: true, note: s.note };
  return { endpoint: url, curated: false };
}
