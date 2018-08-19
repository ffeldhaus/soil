class GamesController < ApplicationController
  # GET /games.json
  def index
    games = Game.all
    render json: GameSerializer.new(games).serialized_json
  end
end
