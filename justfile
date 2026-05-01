set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

release tag:
    test -n "{{tag}}"
    git tag "{{tag}}"
    git push origin "{{tag}}"
