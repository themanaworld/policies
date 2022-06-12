# The Mana World Policies
Contains the legal documents and policies observed by The Mana World.

## Policy files
Policy files are are located in the [policies](policies) directory.
Currently, only Markdown is supported for policy files.

### Front Matter
The Front Matter is a YAML document that defines the properties of the policy.

#### Required properties
- `name`: the full name of the policy
- `description`: a short summary of the policy

#### Optional properties
- `aliases`: an array of path aliases (redirects)
- `ignore`: prevents the policy file from being processed
- `autoupdate`: bindings for [Policybot](https://gitlab.com/evol/policybot)

### Example
```md
---
name: Policy Name
description: A short summary
aliases: [foo, bar]

autoupdate:
  forums: {forum: 1, topic: 69, post: 420}
  wiki: Protected_Wiki_Page
---

# title
content
```

<br>

---

## Generating the static site

### Dependencies
- GNU Make (available in the repos of most linux distros)
- [Deno](https://deno.land) 1.x (can be installed with `make deno`)

```sh
make build
```

## Instant prototyping [![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-click_to_open-blue?logo=gitpod)](https://gitpod.io/#https://git.themanaworld.org/org/policies)
Click the badge to launch a pre-configured online IDE
