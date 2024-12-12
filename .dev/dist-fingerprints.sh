#!/bin/env bash

FILES=$(cat files.txt | xargs)

unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     machine=Linux;;
    Darwin*)    machine=Mac;;
    CYGWIN*)    machine=Cygwin;;
    MINGW*)     machine=MinGw;;
    MSYS_NT*)   machine=MSys;;
    *)          machine="UNKNOWN:${unameOut}"
esac

echo "Platform: ${machine}";

case "${machine}" in
    Linux*) hashprefix="";;
    Mac*)   hashprefix="g";;
    *)      hashprefix="";;
esac

md5sum="$(which ${hashprefix}md5sum)";
sha1sum="$(which ${hashprefix}sha1sum)";
sha256sum="$(which ${hashprefix}sha256sum)";
sha512sum="$(which ${hashprefix}sha512sum)";
bun="$(which bun)";

echo "Tools:";
echo "- bun: ${bun}";
echo "- md5sum: ${md5sum}";
echo "- sha1sum: ${sha1sum}";
echo "- sha256sum: ${sha256sum}";
echo "- sha512sum: ${sha512sum}";

echo "";
echo "------------ Begin release processing";
echo "";

DIST=1 \
    MD5SUM="${md5sum}" \
    SHA1SUM="${sha1sum}" \
    SHA256SUM="${sha256sum}" \
    SHA512SUM="${sha512sum}" \
    ${bun} \
    run \
    ../.dev/dist-fingerprint.mts \
    $FILES;
