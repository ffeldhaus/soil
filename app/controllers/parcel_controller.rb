class ParcelController < ApplicationController
  wrap_parameters format: [:json]

  # PUT /parcel/X.json
  def update
    logger.info params
    @parcel = Parcel.find_by_id(params[:id])

    @parcel.update!(plantation: params[:plantation])

    render json: ParcelSerializer.new(@parcel).serialized_json
  end
end
