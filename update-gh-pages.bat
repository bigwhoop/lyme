@echo off

git co gh-pages
git co master -- README.md
git cim "updated README.md from master branch"
git co master