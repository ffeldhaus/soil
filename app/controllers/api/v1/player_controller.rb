class Api::V1::PlayerController < ApplicationController
  before_action :authenticate_player!

  # GET /player/X.json
  def show
    @player = Player.find_by_id(params[:id])
    render json: PlayerSerializer.new(@player, :include => [:rounds]).serialized_json
  end
end
