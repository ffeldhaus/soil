class Api::V1::GameController < ApplicationController
  before_action :authenticate_player!, only: :show
  before_action :authenticate_admin!, only: [:index, :create, :destroy]

  # GET /game
  def index
    @games = current_admin.games
    options = {}
    options[:include] = [:players]
    render json: GameSerializer.new(@games, options).serialized_json
  end

  # GET /game/X.json
  def show
    if current_user.class.name == 'Player'
      if current_user.game.id == params[:id]
        @game = Game.find_by_id(params[:id])
        render json: GameSerializer.new(@game).serialized_json
      else
        render json: {error: "Access to game with ID #{params[:id]} forbidden"}, status: :forbidden
      end
    end
  end

  # POST /game
  def create
    game = current_admin.games.create(:name => params[:name])
    game.save!
    params[:numberOfPlayers].times do |i|
      password = SecureRandom.hex 4
      player = game.players.create(:email => 'player' + i.to_s + '@game' + game.id.to_s + 'soil.app', :password => password)
      player.save!
    end
  end

  # DELETE /game/X.json
  def destroy
    game = current_admin.games.find_by_id(params[:id])
    game.destroy
  end
end
