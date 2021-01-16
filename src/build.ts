import { Marked } from "https://deno.land/x/markdown/mod.ts"

/** references a forum post */
type ForumEntry = {
	forum?: number;
	topic?: number;
	post: number;
} | number;

/** the structure of the front matter */
interface PolicyYFM {
	name: string;
	description: string;
	aliases?: string[];
	ignore?: boolean;
	autoupdate?: {
		forums?: ForumEntry | ForumEntry[];
		wiki?: string | string[];
	};
}

const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();

/** the source of the index page */
const index = {
	prefix: `
<!doctype html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>The Mana World Policies</title>
	<meta name="description" content="Active policies on The Mana World">
	<link rel="stylesheet" href="style.css">
	<link rel="canonical" href="https://policies.themanaworld.org/">
</head>
<body>
<main>
<nav>
<h1>TMW Policies</h1>
<ul>
`.trim(), list: "", suffix: "</ul>\n</nav>\n</main>\n</body>\n</html>"
};

/** the _redirects file used by netlify */
let _redirects = "";
/** the [routes] portion of the yaml file used by Render */
let render_yaml = "";

/** a map of all generated path aliases */
const routes: Map<string, Set<string>> = new Map();

console.info(">> Building the static site...");

// empty the build directory
await Deno.remove("build", { recursive: true });

// loop through policy files
for await (const dirEntry of Deno.readDir("policies")) {
	const file: string = dirEntry.name;
	const [shortName, type] = file.split(".");

	if (type.toLowerCase() !== "md") {
		console.log(`Unsupported policy file format: ${file}`);
		continue;
	}

	const rawPolicy = decoder.decode(await Deno.readFile(`policies/${file}`));

	if (!rawPolicy.trimStart().startsWith("---")) {
		console.log(`Ignoring policy file with no front matter: ${file}`);
		continue;
	}

	// parse front matter and markdown:
	const {content: html, meta: YFM} = Marked.parse(rawPolicy);

	if (Reflect.has(YFM, "ignore") || file.startsWith(".")) {
		console.log(`Ignoring disabled policy file: ${file}`);
		continue;
	}

	// add to the index page
	index.list += `<li><a href="/${shortName}" title="${YFM.description}" aria-label="${YFM.description}">${YFM.name}</a></li>\n`;

	// add to the netlify redirect file
	_redirects += `/${shortName} /${shortName}/index.html 200!\n`;

	/** a Set<string> of all aliases for this policy */
	const aliases: Set<string> = new Set(Reflect.has(YFM, "aliases") ? YFM.aliases : []);

	/** generates aliases from common path substitutions */
	const generateCommonAliases = (path: string) => {
		const substitutions = [
			["-", "_"],
			["_", "-"],
			["-"],
			["_"],
		];

		for (const substitution of substitutions) {
			const replacement = path.replace(substitution[0], substitution[1] ?? "");
			aliases.add(replacement);
			aliases.add(replacement.toLowerCase());
		}

		// lower case
		aliases.add(path.toLowerCase());
	};

	// built-in aliases
	generateCommonAliases(shortName);

	// process path aliases (and duplicate before iterating)
	for (const alias of new Set(aliases)) {
		generateCommonAliases(alias);
	}

	// make sure we don't include the article itself in its alias Set
	aliases.delete(shortName);

	// add all aliases to the netlify _redirects file and the Render yaml file
	for (const alias of aliases) {
		_redirects += `/${alias} /${shortName} 302\n`
		render_yaml += `- type: redirect\n  source: /${alias}\n  destination: /${shortName}\n`;
	}

	// record the aliases in the global routes map
	routes.set(shortName, aliases);

	// wrap the generated html inside our template
	const policyPage = encoder.encode(`
<!doctype html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>The Mana World – ${YFM.name}</title>
	<meta name="description" content="${YFM.description}">
	<link rel="stylesheet" href="../style.css">
	<link rel="canonical" href="https://policies.themanaworld.org/${shortName}">
</head>
<body>
<article>
${html}
</article>
<footer>Copyright &copy The Mana World &mdash; Generated on ${(new Date()).toISOString()}</footer>
</body>
</html>
`.trim());

	// create a subdirectory for it
	await Deno.mkdir(`build/${shortName}`, {recursive: true});
	await Deno.writeFile(`build/${shortName}/index.html`, policyPage, {create: true});
	await Deno.mkdir(`build/${shortName}/raw`, {recursive: true});
	await Deno.writeFile(`build/${shortName}/raw/index.html`, encoder.encode(html), {create: true});
}

// write the index page
const indexPage = encoder.encode(index.prefix + index.list + index.suffix);
await Deno.writeFile("build/index.html", indexPage, {create: true});

// write the _redirects file (netlify)
await Deno.writeFile("build/_redirects", encoder.encode(_redirects), {create: true});

// write the render.yaml file (render)
await Deno.writeFile("build/render.yaml", encoder.encode(render_yaml), {create: true});

// write the routes.json file (generic)
const routes_obj: any = {};
for (const [route, aliases] of routes) {
	routes_obj[route] = [...aliases]; // convert the Map
}
await Deno.writeFile("build/routes.json", encoder.encode(JSON.stringify(routes_obj)), {create: true});

// copy static assets
for await (const dirEntry of Deno.readDir("src/static")) {
	await Deno.copyFile(`src/static/${dirEntry.name}`, `build/${dirEntry.name}`,);
}

console.info(">> Build success ✅");
