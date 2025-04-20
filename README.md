# File Splitter
This tool takes a single file as an input and splits it into encrypted chunks of a specified size.

Rquirements:
--------------------
- Node.js

Usage:
--------------------
To split a file:
- Place your file in the "input" folder.
- Run the code using `node split.js`.
- The processed files will be saved in the "output" folder with an index.json file containing the secret keys.

The default output chunk size is 24MiB.

To join the chunks together:
- Place the chunks including the index.json file in the "input" folder.
- Run the code using `node join.js`
- The file will be saved in the "output" folder.

Warning!
--------------------
I do not recommend using it for serious tasks; I am not responsible for any data loss. Use at your own risk.
