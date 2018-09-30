class RoundController < ApplicationController
  # GET /round/X.json
  def show
    @round = Round.find_by_id(params[:id])
    render json: RoundSerializer.new(@round).serialized_json
  end
end
