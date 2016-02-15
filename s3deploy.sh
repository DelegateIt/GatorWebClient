#!/bin/bash

aws s3 sync www s3://$1 --include "*" --delete --no-follow-symlinks --acl public-read

