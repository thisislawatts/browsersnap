Browsersnap
===

Installation
---

```
npm install browsersnap
```

Create a `.browserstack` file containing your account details.

```json
{
  "username": "an@example.address",
  "password": "bar"
}
```

Run `browsersnap browsers` to get a list of all the browsers available.


Usage
---

```
browsersnap --version
browsersnap browsers
browsersnap get [url|comma,seperated,list,of,urls]
```

A `.browsersnap` file can be added to act as config file that can be stored in version control and shared to ensure consist tests.

```json
{
	"urls" : [
		"http://example.com",
		"http://browserstack.com"
	],
	"browsers": [
		{
			"os": "Windows",
			"os_version": "10",
			"browser": "edge",
			"device": null,
			"browser_version": "13.0"
		}
	]
}
```

After adding a `.browsersnap` file you can run `browsersnap get` in the same directory as that file.

