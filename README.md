Browsersnap
===

Installation
---

```
git clone git@github.com:thisislawatts/Screenshots.git
npm install
```

You'll then need to create a `browserstack.json` file

```
{
  "username": "foo",
  "password": "bar"
}
```


Usage
---

```
./browsersnap.js --version
./browsersnap.js browsers
./browsersnap.js get [url]
```

If you want to cycle through a bulk collection of URLs just pass through a .json
file.

```
./browsersnap.js get ./path/to.json
```

This file should be structured as:

```json
{
	urls: []
}
```



To Do
---

* Central queuing system
