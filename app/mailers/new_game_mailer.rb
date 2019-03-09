class NewGameMailer < ApplicationMailer
  def send_new_game_mail(admin,game,players)
    @admin = admin
    @game = game
    @players = players
    mail( :to => @admin.email,
          :subject => 'Neues Spiel erstellt bei soil.app' )
  end
end
