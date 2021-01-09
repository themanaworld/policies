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

// the _redirects file used by netlify
let redirects = "";

console.info(">> Building the static site...");

// empty the build directory
await Deno.remove("build", { recursive: true });

// loop through policy files
for await (const dirEntry of Deno.readDir("policies")) {
	const file = dirEntry.name;
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
	redirects += `/${shortName} /${shortName}/index.html 200!\n`;

	// built-in aliases
	if (shortName != shortName.replace("-", "_")) {
		redirects += `/${shortName.replace("-", "_")} /${shortName} 302\n`;
	} if (shortName != shortName.replace("-", "")) {
		redirects += `/${shortName.replace("-", "")} /${shortName} 302\n`;
	}

	// process path aliases
	if (Reflect.has(YFM, "aliases")) {
		for (const alias of YFM.aliases as string[]) {
			redirects += `/${alias} /${shortName} 302\n`;

			if (alias != alias.toLowerCase()) {
				redirects += `/${alias.toLocaleLowerCase()} /${shortName} 302\n`;
			}
		}
	}

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
await Deno.writeFile("build/_redirects", encoder.encode(redirects), {create: true});

// copy static assets
for await (const dirEntry of Deno.readDir("src/static")) {
	await Deno.copyFile(`src/static/${dirEntry.name}`, `build/${dirEntry.name}`,);
}

console.info(">> Build success ✅");
