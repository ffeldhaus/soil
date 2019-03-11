class Api::V1::GameController < ApplicationController
  before_action :authenticate_player!, only: :show
  before_action :authenticate_admin!, only: [:index, :create, :destroy]

  # GET /game
  def index
    @games = current_admin.games
    @options = {}
    @options[:include] = [:players]
    render json: GameSerializer.new(@games, @options).serialized_json
  end

  # GET /game/X.json
  def show
    @game = current_player.game
    if @game.id.to_s == params[:id]
      render json: GameSerializer.new(@game).serialized_json
    else
      render json: {error: "Access to game with ID #{params[:id]} forbidden"}, status: :forbidden
    end
  end

  # POST /game
  def create
    @admin = Admin.find_by_id(current_admin.id)
    @game = current_admin.games.create(:name => params[:name])
    @game.save!
    @players = []
    params[:numberOfPlayers].times do |i|
      @password = SecureRandom.hex 4
      number = i + 1
      @player = @game.players.create(:email => 'player' + number.to_s + '@game' + @game.id.to_s + '.soil.app', :password => @password)
      @player.save!
      @players << {number: number, password: @password}
    end
    NewGameMailer.send_new_game_mail(@admin,@game,@players).deliver
    @options = {}
    @options[:include] = [:players]
    render json: GameSerializer.new(@game, @options).serialized_json
  end

  # DELETE /game/X.json
  def destroy
    game = current_admin.games.find_by_id(params[:id])
    game.destroy
  end
end
