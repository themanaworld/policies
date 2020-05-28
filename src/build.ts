import { Marked } from "https://deno.land/x/markdown/mod.ts"
import * as yaml from "https://deno.land/x/js_yaml_port/js-yaml.js"

// the structure of policies/list.yml
interface policyList {
	[file: string]: {
		name: string;
		description: string;
		aliases?: string[];
	};
}

const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();
const policyFile = "policies/list.yml";
const rawPolicies = decoder.decode(await Deno.readFile(policyFile));
const policies: policyList = yaml.load(rawPolicies);

const index = {
	prefix: `
<!doctype html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>The Mana World Policies</title>
	<meta name="description" content="Active policies on The Mana World">
	<link rel="stylesheet" href="/style.css">
	<link rel="canonical" href="https://policies.themanaworld.org/">
</head>
<body>
<nav>
<h1>TMW Policies</h1>
<ul>
`.trim(), list: "", suffix: "</ul></nav>\n</body>\n</html>"
};

// the _redirects file used by netlify
let redirects = "";

console.info(">> Building the static site...");

// empty the build directory
await Deno.remove("build", { recursive: true });

// loop through every policy markdown file
for (const [file, props] of Object.entries(policies)) {
	if (file.startsWith(".")) {
		console.log(`Ignoring disabled policy file: ${file}.md`);
		continue;
	}

	// add to the index page
	index.list += `<li><a href="/${file}" title="${props.description}" aria-label="${props.description}">${props.name}</a></li>\n`;

	// add to the netlify redirect file
	redirects += `/${file} /${file}/index.html 200!\n`;

	// built-in aliases
	if (file != file.replace("-", "_")) {
		redirects += `/${file.replace("-", "_")} /${file} 302\n`;
	} if (file != file.replace("-", "")) {
		redirects += `/${file.replace("-", "")} /${file} 302\n`;
	}

	// process path aliases
	if (Reflect.has(props, "aliases")) {
		for (const alias of props.aliases as string[]) {
			redirects += `/${alias} /${file} 302\n`;

			if (alias != alias.toLowerCase()) {
				redirects += `/${alias.toLocaleLowerCase()} /${file} 302\n`;
			}
		}
	}

	// convert from markdown to html
	const markdown = decoder.decode(await Deno.readFile(`policies/${file}.md`));
	const html: string = Marked.parse(markdown);
	// wrap the generated html with our template
	const policyPage = encoder.encode(`
<!doctype html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>The Mana World – ${props.name}</title>
	<meta name="description" content="${props.description}">
	<link rel="stylesheet" href="/style.css">
	<link rel="canonical" href="https://policies.themanaworld.org/${file}">
</head>
<body>
<article>
${html}
</article>
</body>
</html>
`.trim());

	// create a subdirectory for it
	await Deno.mkdir(`build/${file}`, {recursive: true});
	await Deno.writeFile(`build/${file}/index.html`, policyPage, {create: true});
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