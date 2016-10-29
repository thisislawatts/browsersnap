Browsersnap
===

Installation
---

```
git clone git@github.com:thisislawatts/Screenshots.git
npm install
```

Create a `.browserstack` file containing your account details.

```json
{
  "username": "an@example.address",
  "password": "bar"
}
```


Usage
---

```
browsersnap --version
browsersnap browsers
browsersnap get [url]
```

If you want to cycle through a bulk collection of URLs just pass through a .json
file.

```
./browsersnap.js get ./path/to.json
```

This file should be structured as:

```json
{
	"urls" : []
}
```



To Do
---

* Central queuing system
