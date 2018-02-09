# Setup

## Project Initialization

1. [Install rbenv](https://github.com/rbenv/rbenv#installation)
2. [Install rbenv-gemset plugin](https://github.com/jf/rbenv-gemset#github)
3. Install latest ruby with `rbenv install $(rbenv install -l | grep -v - | tail -1) -v`
4. Tell rbenv to use the latest ruby for the current shell session `rbenv shell $(rbenv install -l | grep -v - | tail -1)`
5. Install rails gem with `gem install rails`
6. Create a new rails application which uses webpack to manage JS assets and the postgresql database `rails new soil --webpack:angular --database postgresql`
7. Change to application folder `cd soil`
8. Rails automatically initializes git, but the files need to be added with `git add .`
9. Then commit all files with `git commit -m "Initial commit" `
10. Add a GitHub repository with `git remote add origin https://github.com/ffeldhaus/soil.git`
11. Push to GitHub with `git push -u origin master`
12. Create Heroku app `heroku create soil`
13. Push to Heroku `git push heroku master`
14. Open Heroku app in Browser `heroku open`

## Application Setup

1. Generate Rails Controller for Angular Frontend `Rails g controller frontend index`
2. 