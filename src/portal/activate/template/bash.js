/**
 *
 * @param {string} portalDirectory
 * @param {string} shellFunctionName]
 * @returns
 */
module.exports = function (portalDirectory, shellFunctionName) {
  return `
PORTAL_DIR="${portalDirectory}"

# create portal directory if it does not exists
[ -d "$PORTAL_DIR" ] || mkdir -p "$PORTAL_DIR"

if [ -d "$PORTAL_DIR" ]; then
    export CDPATH=".:$PORTAL_DIR:/"

    ${shellFunctionName}() {
        # $1: portal link name
        # shellcheck disable=SC2016
        [ "$#" -ne "1" ] && echo 'Usage: ${shellFunctionName} $linkName' && return 1

        # shellcheck disable=SC2086
        TARGET="$(mise run portal-target $1)"
        # shellcheck disable=SC2164
        builtin cd "$TARGET"
    }

    # ${shellFunctionName} completion
    _${shellFunctionName}() {
        # ask yargs to generate completions.
        type_list=$(mise run portal-target-completion)

        # TODO: only first argument after "${shellFunctionName}" is considered
        # shellcheck disable=SC2207
        COMPREPLY=($(compgen -W "\${type_list}" -- "$2"))

        # if no match was found, fall back to filename completion
        if [ \${#COMPREPLY[@]} -eq 0 ]; then
            COMPREPLY=()
        fi

        return 0
    }
    complete -o bashdefault -o default -F _${shellFunctionName} ${shellFunctionName}
fi
`;
}
