class Api::V1::RoundController < ApplicationController
  def index
    # check if new round needs to be started
    current_user.game.start_new_round
    @rounds = current_user.rounds
    render json: RoundSerializer.new(@rounds).serialized_json
  end

  # GET /round/X.json
  def show
    @round = current_user.rounds.find_by_id(params[:id])
    if @round
      render json: RoundSerializer.new(@round).serialized_json
    else
      render json: {error: "Access to round with ID #{params[:id]} not allowed"}, status: :forbidden
    end
  end

  def update
    @round = current_user.rounds.find_by_id(params[:id])
    if @round
      @round.update!(parameters)
      if parameters[:submitted]
        @round.field.update!(submitted: true)
      end
      render json: RoundSerializer.new(@round).serialized_json
    else
      render json: {error: "Access to round with ID #{params[:id]} not allowed"}, status: :forbidden
    end
  end

  private

  def parameters
    params.permit(:fertilize, :pesticide, :organisms, :organic, :machines, :submitted, :confirmed)
  end

end
