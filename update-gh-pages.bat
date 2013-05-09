@echo off

git co master
git co gh-pages -- README.md
git cim "updated README.md from gh-pages branch"
git co gh-pages