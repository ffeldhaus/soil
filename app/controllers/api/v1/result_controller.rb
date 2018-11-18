class Api::V1::ResultController < ApplicationController
  # GET /result
  def index
    @game = current_user.game
    @finished_rounds = @game.rounds.where("number <= ?", @game.current_round)
    @results = @finished_rounds.map { |round| round.result }
    options = {}
    options[:include] = [:round, :expense, :income, :'expense.seed', :'expense.investment', :'expense.running_cost', :'income.harvest']
    render json: ResultSerializer.new(@results, options).serialized_json
  end

  def show
    @result = Result.find_by_id(params[:id])
    if @result.round.player == current_user
      options = {}
      options[:include] = [:round, :expense, :income, :'expense.seed', :'expense.investment', :'expense.running_cost', :'income.harvest']
      render json: ResultSerializer.new(@result, options).serialized_json
    end
  end
end
