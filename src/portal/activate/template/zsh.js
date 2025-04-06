/**
 *
 * @param {string} portalDirectory
 * @param {string} shellFunctionName
 * @returns
 */
module.exports = function (portalDirectory, shellFunctionName) {
  return `
PORTAL_DIR="${portalDirectory}"

# Create portal directory if it does not exist
[[ -d "$PORTAL_DIR" ]] || mkdir -p "$PORTAL_DIR"

if [[ -d "$PORTAL_DIR" ]]; then
    export CDPATH=".:$PORTAL_DIR:/"

    ${shellFunctionName}() {
        # $1: portal link name
        if [[ "$#" -ne 1 ]]; then
            echo 'Usage: ${shellFunctionName} $linkName'
            return 1
        fi

        TARGET="$(mise run portal-target "$1")"
        builtin cd "$TARGET"
    }

    # ${shellFunctionName} completion
    _${shellFunctionName}() {
        local -a type_list
        type_list=("\${(@f)$(mise run portal-target-completion)}")
        _describe 'portal targets' type_list
    }

    compdef _${shellFunctionName} ${shellFunctionName}
fi
`;
}
