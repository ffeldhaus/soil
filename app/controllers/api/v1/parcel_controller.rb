class Api::V1::ParcelController < ApplicationController
  wrap_parameters format: [:json]

  def initialize
    @allowed_plantations = %w(Brachland Ackerbohne Gerste Hafer Kartoffel Mais Roggen Tiere Weizen Zuckerrübe)
  end

  # PUT /parcel/X.json
  def update
    logger.info params
    @parcel = Parcel.find_by_id(params[:id])
    if @parcel.field.round.submitted
      render json: {error: "Round already submitted, cannot change parcel"}, status: :bad_request
    else
      if @allowed_plantations.include?(params[:plantation])
        @parcel.update!(plantation: params[:plantation])
        render json: ParcelSerializer.new(@parcel).serialized_json
      else
        render json: {error: "Plantation #{params[:plantation]} not allowed"}, status: :bad_request
      end
    end
  end
end
