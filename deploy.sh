#!/bin/bash


if [ "$1" == "live" ]; then
    config="production.js"
    s3bucket="delegator-web"
    echo "Deploying to production"
elif [ "$1" == "test" ]; then
    config="test.js"
    s3bucket="test-delegator-web"
    echo "Deploying to test"
else
    echo "Must pass in 'live' or 'test' into $0"
    exit 1
fi

echo "Copying over config"
cp configs/$config www/js/config.js

echo "Pushing changes to $s3bucket"
aws s3 sync www s3://$s3bucket --include "*" --delete --no-follow-symlinks --acl public-read


if [ "$1" == "live" ]; then
    echo "Invalidating cache in cloudfront"
    aws cloudfront create-invalidation --distribution-id E2VXSB9TKC6EYA --paths \*
fi

