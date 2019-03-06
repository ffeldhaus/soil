class Api::V1::AdminController < ApplicationController
  def create
    @admin = Admin.new(first_name: params[:firstName], last_name: params[:lastName], institution: params[:institution], email: params[:email], password: params[:password])
    if @admin.save
      # deliver registration confirmation email
      RegistrationConfirmationMailer.send_registration_confirmation_email(@admin).deliver
      redirect_to(@admin, :notice => 'Admin created')
    else
      render json: { error: 'Creating admin failed' }, status: :unprocessable_entity
    end
  end
end