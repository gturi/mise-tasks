#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then set -o xtrace; fi
export SHELLOPTS

currentDir="$(dirname "$0")"

cd "$currentDir"

echo 'mise tasks: the installer assumes that mise is correctly installed for your shell as explained at:'
echo '- https://mise.jdx.dev/installing-mise.html#shells'
echo '- https://mise.jdx.dev/cli/completion.html#flags'

# reloads executables in $PATH
hash -r

mise use -g usage

mise use -g node@lts

node setup-mise-tasks.js
