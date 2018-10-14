class Api::V1::PlayerController < ApplicationController
  # GET /player/X.json
  def show
    # TODO: Implement authentication check
    @player = Player.find_by_id(params[:id])
    render json: PlayerSerializer.new(@player, :include => [:rounds]).serialized_json
  end
end
