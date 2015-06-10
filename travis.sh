repo="https://${GH_TOKEN}@github.com/$TRAVIS_REPO_SLUG.git"

# If this is not a pull request, we dont want to continue
if [ "$TRAVIS_PULL_REQUEST" == "false" ] ; then
  echo "Nothing to do on a pull request"
  exit 0
fi

git fetch

# This part of the script is run before installing deps or tests
if [ "$1" = "before" ] ; then
	git checkout -b incoming-pr-$TRAVIS_BUILD_ID
	git push $repo incoming-pr-$TRAVIS_BUILD_ID
	git checkout master
    exit 0
fi