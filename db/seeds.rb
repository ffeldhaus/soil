# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rails db:seed command (or created alongside the database with db:setup).
#
# Examples:
#
#   movies = Movie.create([{ name: 'Star Wars' }, { name: 'Lord of the Rings' }])
#   Character.create(name: 'Luke', movie: movies.first)

admin = Admin.create(:name => 'administrator', :password => 'administrator', :password_confirmation => 'administrator')
admin.save!
supervisor = admin.supervisors.create(:name => 'ffeldhaus', :first_name => 'Florian', :last_name => 'Feldhaus', :email => 'florian.feldhaus@gmail.com', :password => 'ffeldhaus', :password_confirmation => 'ffeldhaus')
supervisor.save!

game = supervisor.games.create(:name => 'Test')

game.save!

# example with 8 players
#game.players.create(:name => 'Gruppe 1', :password => 'M3LLlePr', :password_confirmation => 'M3LLlePr')
#game.players.create(:name => 'Gruppe 2', :password => 'gCN6oriI', :password_confirmation => 'gCN6oriI')
#game.players.create(:name => 'Gruppe 3', :password => 'E2Ia9mEA', :password_confirmation => 'E2Ia9mEA')
#game.players.create(:name => 'Gruppe 4', :password => 'test', :password_confirmation => 'test')
#game.players.create(:name => 'Gruppe 5', :password => 'test', :password_confirmation => 'test')
#game.players.create(:name => 'Gruppe 6', :password => 'test', :password_confirmation => 'test')
#game.players.create(:name => 'Gruppe 7', :password => 'test', :password_confirmation => 'test')
#game.players.create(:name => 'Gruppe 8', :password => 'test', :password_confirmation => 'test')

# example with 1 player
game.players.create(:name => 'Gruppe 1', :password => 'Soil1234', :password_confirmation => 'Soil1234')

game.save!