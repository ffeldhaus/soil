class Api::V1::FieldController < ApplicationController

  # TODO: Implement authentication check

  # GET /field/X.json
  def show
    @field = Field.find_by_id(params[:id])
    render json: FieldSerializer.new(@field, :include => [:parcels]).serialized_json
  end
end
