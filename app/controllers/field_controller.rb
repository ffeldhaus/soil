class FieldController < ApplicationController
  # GET /field/X.json
  def show
    @field = Field.find_by_id(params[:id])
    render json: FieldSerializer.new(@field, :include => [:parcels]).serialized_json
  end
end
