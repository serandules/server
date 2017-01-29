# server

for dir in *; do cd $dir; pwd; find . -iname config | xargs grep -l '\/\/github' | xargs sed -i -e 's/\/\/github.com/\/\/serandomps@github.com/g'; cd ..; done
for dir in *; do cd $dir; pwd; git add .; git commit -m "updating"; git push; cd ..; done
for dir in *; do cd $dir; pwd; git status; cd ..; done
for dir in *; do cd $dir; pwd; rm master; rm -rf master; ln -s `pwd` master; cd ..; done
for dir in *; do cd $dir; pwd; echo "master" >> .gitignore; cd ..; done

for dir in *; do cd $dir; pwd; find . -iname config | xargs grep -l '\/\/github' | xargs sed -i -e 's/\/\/github.com/\/\/serandules@github.com/g'; cd ..; done
