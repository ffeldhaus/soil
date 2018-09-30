class GameController < ApplicationController
  # GET /game/X.json
  def show
    @game = Game.find_by_id(params[:id])
    render json: GameSerializer.new(@game).serialized_json
  end
end
