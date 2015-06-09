repo="https://${GH_TOKEN}@github.com/$TRAVIS_REPO_SLUG.git"

git fetch
git branch --all
# This part of the script is run before installing deps or tests
if [ "$1" = "before" ] ; then
	echo "----BEFORE MESSAGE----"
		exit 0
fi

if [ "$1" = "branch" ] ; then
	echo "----BRANCH MESSAGE----"
fi