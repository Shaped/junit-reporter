## junit reporter for `node:test`

`junit` XML reporter for Node.js's built in test runner (`node:test`)

See https://nodejs.org/api/test.html for more information about the built in test runner.

#### Usage:

From the CLI, using `--test` and outputting to `stdout`:

```shell
$ node --test-reporter=@shaped/junit-reporter --test-reporter-destination=stdout --test
```

Or, if using your own test script to launch tests, outputting to `stdout`:

```shell
$ node --test-reporter=@shaped/junit-reporter --test-reporter-destination=stdout test/your_test_script.js
```

You can also set `--test-reporter-destination` to a file to have the output saved to that file instead.

From Code when using the `run()` method of `node:test`, piped to `stdout`:

```javascript
import junitReporter from '@paytrie/junit-reporter';


run({ files: [
		path.resolve('./test/your_test_script.js')
	]}).pipe(junitReporter).pipe(stdout);
```

#### (C) 2023 Shaped.ca (forbiddenera)
