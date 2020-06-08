# The Mana World Policies
Contains the legal documents and policies observed by The Mana World.

## Policy files
Policy files are are located in the [policies](policies) directory.
Currently, only Markdown is supported for policy files.

### Front Matter
The Front Matter is a YAML document that defines the properties of the policy.

#### Required properties
- name: the full name of the policy
- description: a short summary of the policy

#### Optional properties
- aliases: an array of path aliases (redirects)
- ignore: prevents the policy file from being built

### Example
```md
---
name: Policy Name
description: A short sumary
aliases: [foo, bar]
---

# title
content
```

<br>

---

## Generating the static site

### Dependencies
- GNU Make (pre-installed in most linux distros)
- [Deno](https://deno.land) 1.x (can be installed with `make deno`)

```sh
make build
```
